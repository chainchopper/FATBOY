import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiIntegrationService } from '../services/ai-integration.service';
import { SpeechService } from '../services/speech.service';
import { Subscription } from 'rxjs';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
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
  private speechSubscription!: Subscription;
  
  availableCommands: SlashCommand[] = [
    { command: '/suggest', description: 'Get a personalized product suggestion.', usage: '/suggest' },
    { command: '/summarize', description: 'Summarize your recent activity.', usage: '/summarize' },
    { command: '/find', description: 'Find products with a specific ingredient.', usage: '/find <ingredient>' },
    { command: '/playwright', description: 'Run a Playwright test.', usage: '/playwright <test_name>' }
  ];
  filteredCommands: SlashCommand[] = [];

  constructor(
    private aiService: AiIntegrationService,
    private speechService: SpeechService
  ) {}

  ngOnInit() {
    this.messages.push({
      sender: 'agent',
      text: 'Welcome to the Agent Console. I am powered by RStar Coder Qwen3. How can I help you today?',
      timestamp: new Date()
    });

    this.speechSubscription = this.speechService.commandRecognized.subscribe(transcript => {
      this.userInput = transcript;
      this.sendMessage();
      this.isListening = false;
    });
  }

  ngOnDestroy() {
    if (this.speechSubscription) {
      this.speechSubscription.unsubscribe();
    }
    this.speechService.stopListening();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
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

    this.messages.push({ sender: 'user', text, timestamp: new Date() });
    this.userInput = '';
    this.showSlashCommands = false;
    this.isAgentTyping = true;

    try {
      const responseText = await this.aiService.getChatCompletion(text);
      this.messages.push({ sender: 'agent', text: responseText, timestamp: new Date() });
    } catch (error) {
      this.messages.push({ sender: 'agent', text: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() });
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