import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiIntegrationService } from '../services/ai-integration.service';
import { ProductDbService } from '../services/product-db.service';
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
    private productDb: ProductDbService,
    private speechService: SpeechService
  ) {}

  ngOnInit() {
    this.messages.push({
      sender: 'agent',
      text: 'Welcome to the Agent Console. Type a message, use a `/` command, or tap the mic to speak.',
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

    setTimeout(() => {
      const responseText = this.mockAgentResponse(text);
      this.messages.push({ sender: 'agent', text: responseText, timestamp: new Date() });
      this.isAgentTyping = false;
    }, 1500);
  }

  mockAgentResponse(command: string): string {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('suggest') || lowerCommand.includes('recommend')) {
      return "Based on your recent activity, I suggest trying 'Organic Berry Granola'. It aligns with your preference for natural ingredients.";
    }
    if (lowerCommand.includes('summarize') || lowerCommand.includes('summary')) {
      const history = this.productDb.getProductsSnapshot();
      if (history.length === 0) {
        return "You haven't scanned any products yet. Start scanning to get a summary of your activity!";
      }
      const goodScans = history.filter(p => p.verdict === 'good').length;
      return `You've scanned ${history.length} products recently. ${goodScans} of them were Fat Boy Approved. Keep up the great work!`;
    }
    if (lowerCommand.startsWith('/find') || lowerCommand.startsWith('find')) {
      const ingredient = command.split(' ').slice(1).join(' ') || 'anything';
      return `I've searched the community database for products containing '${ingredient}' and found 3 matches. Would you like to see them?`;
    }
    if (lowerCommand.includes('playwright')) {
      const test = command.split(' ')[1] || 'login';
      return `Executing Playwright test '${test}'... Test passed successfully in 2.3s. All assertions met.`;
    }
    return "I'm sorry, I don't understand that command. Type `/` to see what I can do, or just ask me a question.";
  }

  private scrollToBottom(): void {
    try {
      this.messageWindow.nativeElement.scrollTop = this.messageWindow.nativeElement.scrollHeight;
    } catch(err) { }
  }
}