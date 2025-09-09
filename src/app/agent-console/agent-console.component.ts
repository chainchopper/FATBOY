import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiIntegrationService, AiResponse } from '../services/ai-integration.service';
import { SpeechService } from '../services/speech.service';
import { AuthService } from '../services/auth.service';
import { PreferencesService } from '../services/preferences.service';
import { ProfileService } from '../services/profile.service';
import { AppModalService } from '../services/app-modal.service';
import { Subscription, interval } from 'rxjs';
import { supabase } from '../../integrations/supabase/client';

interface Message {
  sender: 'user' | 'agent' | 'tool';
  text: string;
  timestamp: Date;
  avatar: string;
  suggestedPrompts?: string[]; // Renamed from followUpQuestions
  toolCalls?: any[];
  humanReadableToolCall?: string;
}

interface SlashCommand {
  command: string;
  description: string;
  usage: string;
}

@Component({
  selector: 'app-agent-console',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-console.component.html',
  styleUrls: ['./agent-console.component.css']
})
export class AgentConsoleComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageWindow') private messageWindow!: ElementRef;

  messages: Message[] = [];
  userInput: string = '';
  showSlashCommands = false;
  isAgentTyping = false;
  isListening = false;
  agentStatus: 'online' | 'offline' = 'offline';
  private speechSubscription!: Subscription;
  private statusSubscription!: Subscription;
  private authSubscription!: Subscription;
  private preferencesSubscription!: Subscription;
  public agentAvatar = 'assets/logo64.png';
  public userAvatar: string = 'https://api.dicebear.com/8.x/initials/svg?seed=Anonymous';
  public userName: string = 'You';
  private currentUserId: string | null = null;
  
  availableCommands: SlashCommand[] = [
    { command: '/suggest', description: 'Get a personalized product suggestion.', usage: '/suggest' },
    { command: '/summarize', description: 'Summarize your recent activity.', usage: '/summarize' },
    { command: '/find', description: 'Find products with a specific ingredient.', usage: '/find <ingredient>' },
    { command: '/playwright', description: 'Run a Playwright test.', usage: '/playwright <test_name>' }
  ];
  filteredCommands: SlashCommand[] = [];

  constructor(
    private aiService: AiIntegrationService,
    private speechService: SpeechService,
    private authService: AuthService,
    private preferencesService: PreferencesService,
    private profileService: ProfileService,
    private appModalService: AppModalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.checkStatus();
    this.statusSubscription = interval(300000).subscribe(() => this.checkStatus());

    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      const previousUserId = this.currentUserId;
      this.currentUserId = user?.id || null;
      if (this.currentUserId && this.currentUserId !== previousUserId) {
        this.loadChatHistory();
      }
      if (user) {
        this.profileService.getProfile().subscribe(profile => {
          if (profile) {
            this.userName = profile.first_name || user.email?.split('@')[0] || 'You';
            this.userAvatar = profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${this.userName}`;
          } else {
            this.userName = user.email?.split('@')[0] || 'You';
            this.userAvatar = `https://api.dicebear.com/8.x/initials/svg?seed=${this.userName}`;
          }
        });
      } else {
        this.userName = 'You';
        this.userAvatar = 'https://api.dicebear.com/8.x/initials/svg?seed=Anonymous';
        this.messages = []; // Clear messages if logged out
      }
    });

    this.preferencesSubscription = this.preferencesService.preferences$.subscribe(prefs => {
      if (prefs.enableVoiceCommands) {
        this.speechService.startListening();
        this.isListening = true;
      } else {
        this.speechService.stopListening();
        this.isListening = false;
      }
    });

    this.speechSubscription = this.speechService.commandRecognized.subscribe(transcript => {
      this.userInput = transcript;
      this.sendMessage();
      this.isListening = false;
    });
  }

  ngOnDestroy() {
    if (this.speechSubscription) this.speechSubscription.unsubscribe();
    if (this.statusSubscription) this.statusSubscription.unsubscribe();
    if (this.authSubscription) this.authSubscription.unsubscribe();
    if (this.preferencesSubscription) this.preferencesSubscription.unsubscribe();
    this.speechService.stopListening();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  async checkStatus() {
    const isOnline = await this.aiService.checkAgentStatus();
    this.agentStatus = isOnline ? 'online' : 'offline';
    this.cdr.detectChanges();
  }

  toggleVoiceListening() {
    const currentPrefs = this.preferencesService.getPreferences();
    this.preferencesService.savePreferences({ ...currentPrefs, enableVoiceCommands: !currentPrefs.enableVoiceCommands });
  }

  handleInput() {
    if (this.userInput.startsWith('/')) {
      this.showSlashCommands = true;
      const search = this.userInput.substring(1).toLowerCase();
      this.filteredCommands = this.availableCommands.filter(c => c.command.toLowerCase().includes(search));
    } else {
      this.showSlashCommands = false;
    }
  }

  selectCommand(command: SlashCommand) {
    this.userInput = command.usage + ' ';
    this.showSlashCommands = false;
  }

  async sendMessage() {
    const text = this.userInput.trim();
    if (!text) return;

    const userMessage: Message = { sender: 'user', text, timestamp: new Date(), avatar: this.userAvatar };
    this.messages.push(userMessage);
    this.saveMessage(userMessage);

    this.userInput = '';
    this.showSlashCommands = false;
    this.isAgentTyping = true;

    const messagesHistoryForAi = this.messages.slice(0, -1).map(msg => ({
      role: msg.sender === 'agent' ? 'assistant' : msg.sender,
      content: msg.text,
      ...(msg.toolCalls && { tool_calls: msg.toolCalls })
    }));

    try {
      const aiResponse: AiResponse = await this.aiService.getChatCompletion(text, messagesHistoryForAi);
      
      const agentMessage: Message = {
        sender: 'agent',
        text: aiResponse.text,
        timestamp: new Date(),
        avatar: this.agentAvatar,
        suggestedPrompts: aiResponse.suggestedPrompts,
        toolCalls: aiResponse.toolCalls,
        humanReadableToolCall: aiResponse.humanReadableToolCall
      };
      
      this.messages.push(agentMessage);
      this.saveMessage(agentMessage);
      this.speechService.speak(aiResponse.text);

    } catch (error) {
      const errorMessage: Message = { sender: 'agent', text: 'Sorry, I encountered an error. Please try again.', timestamp: new Date(), avatar: this.agentAvatar };
      this.messages.push(errorMessage);
      this.saveMessage(errorMessage);
    } finally {
      this.isAgentTyping = false;
    }
  }

  submitSuggestedPrompt(prompt: string) {
    this.userInput = prompt;
    this.sendMessage();
  }

  private scrollToBottom(): void {
    try {
      this.messageWindow.nativeElement.scrollTop = this.messageWindow.nativeElement.scrollHeight;
    } catch(err) { }
  }

  private async loadChatHistory(): Promise<void> {
    if (!this.currentUserId) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('sender, content, created_at')
      .eq('user_id', this.currentUserId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading chat history:', error);
      return;
    }

    if (data && data.length > 0) {
      this.messages = data.map((item: any) => ({
        sender: item.sender,
        text: item.content.text,
        timestamp: new Date(item.created_at),
        avatar: item.sender === 'user' ? this.userAvatar : this.agentAvatar,
        suggestedPrompts: item.content.suggestedPrompts,
        toolCalls: item.content.toolCalls,
        humanReadableToolCall: item.content.humanReadableToolCall
      }));
    } else {
      this.messages = [{
        sender: 'agent',
        text: 'Hello! I am Fat Boy, your personal AI co-pilot, powered by NIRVANA from Fanalogy. How can I help you today?',
        timestamp: new Date(),
        avatar: this.agentAvatar,
        suggestedPrompts: [
          'What are some healthy snack options?',
          'Can you summarize my recent food diary entries?',
          'How do I add a product to my shopping list?'
        ]
      }];
    }
    this.cdr.detectChanges();
  }

  private async saveMessage(message: Message): Promise<void> {
    if (!this.currentUserId) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: this.currentUserId,
        sender: message.sender,
        content: {
          text: message.text,
          suggestedPrompts: message.suggestedPrompts,
          toolCalls: message.toolCalls,
          humanReadableToolCall: message.humanReadableToolCall
        }
      });

    if (error) {
      console.error('Error saving chat message:', error);
    }
  }

  clearChatHistory(): void {
    this.appModalService.openConfirmation({
      title: 'Clear Chat History?',
      message: 'Are you sure you want to clear your entire chat history? This action cannot be undone.',
      confirmText: 'Clear',
      cancelText: 'Keep Chat',
      onConfirm: async () => {
        if (!this.currentUserId) return;
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .eq('user_id', this.currentUserId);

        if (error) {
          console.error('Error clearing chat history:', error);
        } else {
          this.loadChatHistory(); // Reload to show the initial greeting
          this.speechService.speak('Chat history cleared.');
        }
      },
      onCancel: () => {
        this.speechService.speak('Chat clearing cancelled.');
      }
    });
  }
}