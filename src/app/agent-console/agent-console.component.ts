import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiIntegrationService } from '../services/ai-integration.service';
import { SpeechService } from '../services/speech.service';
import { Subscription, interval } from 'rxjs';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  avatar: string;
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
  private agentAvatar = 'assets/logo.png';
  
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.checkStatus();
    this.statusSubscription = interval(300000).subscribe(() => this.checkStatus()); // Check every 5 minutes

    this.messages.push({
      sender: 'agent',
      text: 'Hello! I am Fat Boy, your personal AI co-pilot, powered by NIRVANA from Fanalogy. How can I help you today?',
      timestamp: new Date(),
      avatar: this.agentAvatar
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
    this.isListening = !this.isListening;
    if (this.isListening) {
      this.speechService.startListening();
    } else {
      this.speechService.stopListening();
    }
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

    this.messages.push({ sender: 'user', text, timestamp: new Date(), avatar: '' });
    this.userInput = '';
    this.showSlashCommands = false;
    this.isAgentTyping = true;

    try {
      const responseText = await this.aiService.getChatCompletion(text);
      this.messages.push({ sender: 'agent', text: responseText, timestamp: new Date(), avatar: this.agentAvatar });
    } catch (error) {
      this.messages.push({ sender: 'agent', text: 'Sorry, I encountered an error. Please try again.', timestamp: new Date(), avatar: this.agentAvatar });
    } finally {
      this.isAgentTyping = false;
    }
  }

  private scrollToBottom(): void {
    try {
      this.messageWindow.nativeElement.scrollTop = this.messageWindow.nativeElement.scrollHeight;
    } catch(err) { }
  }
}