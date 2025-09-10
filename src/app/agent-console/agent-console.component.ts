import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiIntegrationService, AiResponse, DynamicButton } from '../services/ai-integration.service';
import { SpeechService } from '../services/speech.service';
import { AuthService } from '../services/auth.service';
import { PreferencesService } from '../services/preferences.service';
import { ProfileService } from '../services/profile.service';
import { AppModalService } from '../services/app-modal.service';
import { Subscription, interval } from 'rxjs';
import { Router } from '@angular/router';
import { CameraFeedComponent } from '../camera-feed/camera-feed.component';
import { Product } from '../services/product-db.service';
import { NotificationService } from '../services/notification.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ShareService } from '../services/share.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { FoodDiaryService } from '../services/food-diary.service';
import { ButtonComponent } from '../button/button.component';
import { ChatHistoryService, ChatMessage } from '../services/chat-history.service';
import { ConsoleCameraService } from '../services/console-camera.service';
import { ProductDbService } from '../services/product-db.service';
import { ConsoleCommandService } from '../services/console-command.service';

interface SlashCommand {
  command: string;
  description: string;
  usage: string;
}

@Component({
  selector: 'app-agent-console',
  standalone: true,
  imports: [CommonModule, FormsModule, CameraFeedComponent, ProductCardComponent, ButtonComponent],
  templateUrl: './agent-console.component.html',
  styleUrls: []
})
export class AgentConsoleComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageWindow') private messageWindow!: ElementRef;
  @ViewChild('chatCameraFeed') private chatCameraFeed!: CameraFeedComponent;

  messages: ChatMessage[] = [];
  userInput: string = '';
  showSlashCommands = false;
  isAgentTyping = false;
  isListening = false;
  agentStatus: 'online' | 'offline' = 'offline';
  private lastAgentStatus: 'online' | 'offline' | null = null;

  private speechSubscription!: Subscription;
  private statusSubscription!: Subscription;
  private authSubscription!: Subscription;
  private preferencesSubscription!: Subscription;
  private chatMessagesSubscription!: Subscription;
  private cameraInputProcessedSubscription!: Subscription;
  private cameraClosedSubscription!: Subscription;

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
    private cdr: ChangeDetectorRef,
    private router: Router,
    private notificationService: NotificationService,
    private shareService: ShareService,
    private shoppingListService: ShoppingListService,
    private foodDiaryService: FoodDiaryService,
    private chatHistoryService: ChatHistoryService,
    public consoleCameraService: ConsoleCameraService,
    private productDbService: ProductDbService,
    private consoleCommandService: ConsoleCommandService
  ) {}

  ngOnInit() {
    this.checkStatus();
    this.statusSubscription = interval(300000).subscribe(() => this.checkStatus());

    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      const previousUserId = this.currentUserId;
      this.currentUserId = user?.id || null;
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
      if (this.currentUserId !== previousUserId) {
        this.chatHistoryService.loadChatHistory();
      }
    });

    this.chatMessagesSubscription = this.chatHistoryService.messages$.subscribe(messages => {
      this.messages = messages;
      this.cdr.detectChanges();
      this.executePreloadedCommand();
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

    this.cameraInputProcessedSubscription = this.consoleCameraService.cameraInputProcessed.subscribe(product => {
      this.handleCameraInputProcessed(product);
    });

    this.cameraClosedSubscription = this.consoleCameraService.cameraClosed.subscribe(() => {
      this.handleCameraClosedFromChat();
    });
  }

  ngOnDestroy() {
    this.speechSubscription?.unsubscribe();
    this.statusSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
    this.preferencesSubscription?.unsubscribe();
    this.chatMessagesSubscription?.unsubscribe();
    this.cameraInputProcessedSubscription?.unsubscribe();
    this.cameraClosedSubscription?.unsubscribe();
    this.speechService.stopListening();
    this.consoleCameraService.closeCamera();
  }

  ngAfterViewChecked() { this.scrollToBottom(); }
  ngAfterViewInit() {
    if (this.chatCameraFeed) {
      this.consoleCameraService.setCameraFeedComponent(this.chatCameraFeed);
    }
  }

  private executePreloadedCommand() {
    const command = this.consoleCommandService.getCommand();
    if (command) {
      this.userInput = command;
      this.sendMessage();
    }
  }

  async checkStatus() {
    const isOnline = await this.aiService.checkAgentStatus();
    this.agentStatus = isOnline ? 'online' : 'offline';
    if (this.agentStatus !== this.lastAgentStatus) {
      if (this.agentStatus === 'offline') {
        const offlineMessage: ChatMessage = { sender: 'agent', text: 'It looks like my AI brain is currently offline. I cannot process requests right now. Please check the server status.', timestamp: new Date(), avatar: this.agentAvatar, suggestedPrompts: [] };
        this.chatHistoryService.addAgentMessage(offlineMessage);
        this.speechService.speak('My AI brain is currently offline. I cannot process requests right now.');
      } else if (this.agentStatus === 'online' && this.lastAgentStatus === 'offline') {
        const onlineMessage: ChatMessage = { sender: 'agent', text: 'Great news! My AI brain is back online and ready to assist you.', timestamp: new Date(), avatar: this.agentAvatar, suggestedPrompts: [] };
        this.chatHistoryService.addAgentMessage(onlineMessage);
        this.speechService.speak('Great news! My AI brain is back online and ready to assist you.');
      }
      this.lastAgentStatus = this.agentStatus;
    }
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
    this.chatHistoryService.addUserMessage(text);
    this.userInput = '';
    this.showSlashCommands = false;
    this.isAgentTyping = true;
    const messagesHistoryForAi = this.chatHistoryService.getMessages().map(msg => ({
      role: msg.sender === 'agent' ? 'assistant' : msg.sender,
      content: msg.text,
      ...(msg.toolCalls && { tool_calls: msg.toolCalls })
    }));
    try {
      const aiResponse: AiResponse = await this.aiService.getChatCompletion(text, messagesHistoryForAi);
      this.speechService.speak(aiResponse.text);
      this.chatHistoryService.addAgentMessage(aiResponse); 
    } catch (error) {
      const errorMessage: ChatMessage = { sender: 'agent', text: 'Sorry, I encountered an error. Please try again.', timestamp: new Date(), avatar: this.agentAvatar };
      this.chatHistoryService.addAgentMessage(errorMessage);
    } finally {
      this.isAgentTyping = false;
    }
  }

  submitSuggestedPrompt(prompt: string) {
    this.userInput = prompt;
    this.sendMessage();
  }

  async handleDynamicButtonClick(action: string, payload: any = {}): Promise<void> {
    let simulatedInput = '';
    switch (action) {
      case 'confirm_add_to_shopping_list':
        simulatedInput = `Yes, add "${payload.product_name}" by "${payload.brand}" to my shopping list.`;
        break;
      case 'cancel_add_to_shopping_list':
        simulatedInput = `No, do not add "${payload.product_name}" to my shopping list.`;
        break;
      case 'confirm_add_to_food_diary':
        simulatedInput = `Yes, add "${payload.product_name}" by "${payload.brand}" to my food diary for ${payload.meal_type}.`;
        break;
      case 'cancel_add_to_food_diary':
        simulatedInput = `No, do not add "${payload.product_name}" to my food diary.`;
        break;
      case 'add_to_food_diary_meal_select':
        simulatedInput = `Add "${payload.product_name}" by "${payload.brand}" to my food diary for ${payload.meal_type}.`;
        break;
      case 'open_scanner':
        this.consoleCameraService.openCamera();
        return;
      default:
        simulatedInput = `User clicked: ${action} with payload: ${JSON.stringify(payload)}`;
        break;
    }
    this.userInput = simulatedInput;
    await this.sendMessage();
  }

  shareProductFromConsole(product: Product) {
    this.shareService.shareProduct(product);
  }

  addToShoppingListFromConsole(product: Product) {
    this.shoppingListService.addItem(product);
  }

  addToFoodDiaryFromConsole(product: Product) {
    this.appModalService.open(product);
  }

  onViewDetailsFromConsole(product: Product) {
    this.productDbService.setLastViewedProduct(product);
    this.router.navigate(['/products', product.id]);
  }

  handleCameraInputProcessed(product: Product): void {
    this.userInput = `I just processed "${product.name}" by "${product.brand}". Its verdict is "${product.verdict}". Ingredients: ${product.ingredients.join(', ')}.`;
    this.sendMessage();
  }

  handleCameraClosedFromChat(): void {
    this.speechService.speak('Camera closed.');
  }

  private scrollToBottom(): void {
    try {
      this.messageWindow.nativeElement.scrollTop = this.messageWindow.nativeElement.scrollHeight;
    } catch(err) { }
  }

  clearChatHistory(): void {
    this.appModalService.openConfirmation({
      title: 'Clear Chat History?',
      message: 'Are you sure you want to clear your entire chat history? This action cannot be undone.',
      confirmText: 'Clear',
      cancelText: 'Keep Chat',
      onConfirm: async () => {
        await this.chatHistoryService.clearChatHistory();
        this.speechService.speak('Chat history cleared.');
      }
    });
  }
}