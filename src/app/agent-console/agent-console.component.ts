import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiIntegrationService } from '../services/ai-integration.service';

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
export class AgentConsoleComponent implements OnInit {
  messages: Message[] = [];
  userInput: string = '';
  showSlashCommands = false;
  
  availableCommands: SlashCommand[] = [
    { command: '/suggest', description: 'Get a personalized product suggestion.', usage: '/suggest' },
    { command: '/summarize', description: 'Summarize your recent activity.', usage: '/summarize <period>' },
    { command: '/find', description: 'Find products with a specific ingredient.', usage: '/find <ingredient>' },
    { command: '/playwright', description: 'Run a Playwright test.', usage: '/playwright <test_name>' }
  ];
  filteredCommands: SlashCommand[] = [];

  constructor(private aiService: AiIntegrationService) {}

  ngOnInit() {
    this.messages.push({
      sender: 'agent',
      text: 'Welcome to the Agent Console. Type `/` to see available commands.',
      timestamp: new Date()
    });
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

    // Mock agent thinking time
    setTimeout(async () => {
      // In a real app, this would call the AI service
      // const responseText = await this.aiService.executeAgentCommand(text);
      const responseText = this.mockAgentResponse(text);
      this.messages.push({ sender: 'agent', text: responseText, timestamp: new Date() });
    }, 1000);
  }

  mockAgentResponse(command: string): string {
    if (command.startsWith('/suggest')) {
      return "Based on your recent activity, I suggest trying 'Organic Berry Granola'. It aligns with your preference for natural ingredients.";
    }
    if (command.startsWith('/summarize')) {
      return "Summary for last 7 days: You've scanned 12 products, logged 21 meals, and your daily performance verdict has been 'Good' or 'Excellent' 85% of the time. Keep it up!";
    }
    if (command.startsWith('/find')) {
      const ingredient = command.split(' ')[1] || 'anything';
      return `Searching for products containing '${ingredient}'... I've found 3 matching products in our community database. Would you like to add them to a list?`;
    }
    if (command.startsWith('/playwright')) {
      const test = command.split(' ')[1] || 'login';
      return `Executing Playwright test '${test}'... Test passed successfully in 2.3s. All assertions met.`;
    }
    return "I'm sorry, I don't understand that command. Type `/` to see what I can do.";
  }
}