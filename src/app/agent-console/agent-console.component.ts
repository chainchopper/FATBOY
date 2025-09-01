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

interface Message {
  sender: 'user' | 'agent' | 'tool';
  text: string;
  timestamp: Date;
  avatar: string;
  followUpQuestions?: string[];
  toolCalls?: any[]; // Store the raw tool calls
  humanReadableToolCall?: string; // New: for human-readable description
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
      if (this.currentUserId !== previousUserId) {
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

    // Load chat history first
    this.loadChatHistory();

    // If chat history is empty, add the initial greeting with more general follow-up questions
    if (this.messages.length === 0) {
      this.messages.push({
        sender: 'agent',
        text: 'Hello! I am Fat Boy, your personal AI co-pilot, powered by NIRVANA from Fanalogy. How can I help you today?',
        timestamp: new Date(),
        avatar: this.agentAvatar,
        followUpQuestions: [
          'What are some healthy snack options?',
          'Can you summarize my recent food diary entries?',
          'How do I add a product to my shopping list?'
        ]
      });
    }

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

    this.messages.push({ sender: 'user', text, timestamp: new Date(), avatar: this.userAvatar });
    this.userInput = '';
    this.showSlashCommands = false;
    this.isAgentTyping = true;

    // Prepare messages history for the AI, excluding the initial greeting if it's the first message
    const messagesHistoryForAi = this.messages.slice(1).map(msg => ({ // Exclude initial greeting
      role: msg.sender === 'agent' ? 'assistant' : msg.sender,
      content: msg.text,
      ...(msg.toolCalls && { tool_calls: msg.toolCalls })
    }));

    try {
      const aiResponse: AiResponse = await this.aiService.getChatCompletion(text, messagesHistoryForAi);

      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        const toolCall = aiResponse.toolCalls[0]; // Assuming one tool call for simplicity
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let humanReadableText = '';

        if (functionName === 'add_to_shopping_list') {
          humanReadableText = `Adding "${functionArgs.product_name}" by "${functionArgs.brand || 'Unknown Brand'}" to your shopping list.`;
        } else if (functionName === 'add_to_food_diary') {
          humanReadableText = `Adding "${functionArgs.product_name}" by "${functionArgs.brand || 'Unknown Brand'}" to your ${functionArgs.meal_type || 'Unknown'} diary.`;
        } else {
          humanReadableText = `Executing tool: ${functionName}...`;
        }

        this.messages.push({
          sender: 'agent',
          text: 'Executing tool...', // This will be replaced by the AI's natural language response
          timestamp: new Date(),
          avatar: this.agentAvatar,
          toolCalls: aiResponse.toolCalls,
          humanReadableToolCall: humanReadableText // Store human-readable text
        });
      }

      this.messages.push({
        sender: 'agent',
        text: aiResponse.text,
        timestamp: new Date(),
        avatar: this.agentAvatar,
        followUpQuestions: aiResponse.followUpQuestions
      });
      this.speechService.speak(aiResponse.text);
    } catch (error) {
      this.messages.push({ sender: 'agent', text: 'Sorry, I encountered an error. Please try again.', timestamp: new Date(), avatar: this.agentAvatar });
    } finally {
      this.isAgentTyping = false;
      this.saveChatHistory();
    }
  }

  submitFollowUpQuestion(question: string) {
    this.userInput = question;
    this.sendMessage();
  }

  private scrollToBottom(): void {
    try {
      this.messageWindow.nativeElement.scrollTop = this.messageWindow.nativeElement.scrollHeight;
    } catch(err) { }
  }

  private getStorageKey(): string {
    return this.currentUserId ? `fatBoyChatHistory_${this.currentUserId}` : 'fatBoyChatHistory_anonymous';
  }

  private loadChatHistory(): void {
    const stored = localStorage.getItem(this.getStorageKey());
    if (stored) {
      this.messages = JSON.parse(stored).map((msg: Message) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } else {
      this.messages = [];
    }
  }

  private saveChatHistory(): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.messages));
  }

  clearChatHistory(): void {
    this.appModalService.openConfirmation({
      title: 'Clear Chat History?',
      message: 'Are you sure you want to clear your entire chat history? This action cannot be undone.',
      confirmText: 'Clear',
      cancelText: 'Keep Chat',
      onConfirm: () => {
        localStorage.removeItem(this.getStorageKey());
        this.messages = [{
          sender: 'agent',
          text: 'Hello! I am Fat Boy, your personal AI co-pilot, powered by NIRVANA from Fanalogy. How can I help you today?',
          timestamp: new Date(),
          avatar: this.agentAvatar,
          followUpQuestions: [
            'What are some healthy snack options?',
            'Can you summarize my recent food diary entries?',
            'How do I add a product to my shopping list?'
          ]
        }];
        this.cdr.detectChanges();
        this.scrollToBottom();
        this.speechService.speak('Chat history cleared.');
      },
      onCancel: () => {
        this.speechService.speak('Chat clearing cancelled.');
      }
    });
  }
}