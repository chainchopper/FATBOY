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
import { supabase } from '../../integrations/supabase/client';
import { Router } from '@angular/router';
import { CameraFeedComponent } from '../camera-feed/camera-feed.component';
import { BarcodeProcessorService } from '../services/barcode-processor.service';
import { OcrProcessorService } from '../services/ocr-processor.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { NotificationService } from '../services/notification.service';
import { AudioService } from '../services/audio.service';
import { ProductCardComponent } from '../product-card/product-card.component';

// Define UI Element interfaces
interface UiElement {
  type: string; // e.g., 'product_card'
  data: any; // The data for the specific UI element
}

interface Message {
  sender: 'user' | 'agent' | 'tool';
  text: string;
  timestamp: Date;
  avatar: string;
  suggestedPrompts?: string[];
  toolCalls?: any[];
  humanReadableToolCall?: string;
  dynamicButtons?: DynamicButton[];
  uiElements?: UiElement[]; // New: for rich UI elements
}

interface SlashCommand {
  command: string;
  description: string;
  usage: string;
}

@Component({
  selector: 'app-agent-console',
  standalone: true,
  imports: [CommonModule, FormsModule, CameraFeedComponent, ProductCardComponent],
  templateUrl: './agent-console.component.html',
  styleUrls: ['./agent-console.component.css']
})
export class AgentConsoleComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageWindow') private messageWindow!: ElementRef;
  @ViewChild('chatCameraFeed') private chatCameraFeed!: CameraFeedComponent;

  messages: Message[] = [];
  userInput: string = '';
  showSlashCommands = false;
  isAgentTyping = false;
  isListening = false;
  agentStatus: 'online' | 'offline' = 'offline';
  showCameraFeed = false;
  isProcessingCameraInput = false;

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

  private processingAbortController: AbortController | null = null;

  constructor(
    private aiService: AiIntegrationService,
    private speechService: SpeechService,
    private authService: AuthService,
    private preferencesService: PreferencesService,
    private profileService: ProfileService,
    private appModalService: AppModalService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private barcodeProcessorService: BarcodeProcessorService,
    private ocrProcessorService: OcrProcessorService,
    private productDb: ProductDbService,
    private notificationService: NotificationService,
    private audioService: AudioService
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
    this.abortProcessing();
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
        humanReadableToolCall: aiResponse.humanReadableToolCall,
        dynamicButtons: aiResponse.dynamicButtons,
        uiElements: aiResponse.uiElements // Store UI elements
      };
      
      this.messages.push(agentMessage);
      this.saveMessage(agentMessage);
      this.speechService.speak(agentMessage.text);

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
      case 'open_scanner':
        this.showCameraFeed = true;
        this.speechService.speak('Opening the camera now. You can scan a barcode or capture a label.');
        return;
      default:
        simulatedInput = `User clicked: ${action} with payload: ${JSON.stringify(payload)}`;
        break;
    }
    this.userInput = simulatedInput;
    await this.sendMessage();
  }

  // Handlers for actions from dynamically rendered ProductCardComponent
  shareProductFromConsole(product: Product) {
    this.notificationService.showInfo(`Sharing product: ${product.name}`, 'Console Action');
    this.speechService.speak(`Sharing ${product.name}.`);
    // Implement actual sharing logic here, e.g., using ShareService
  }

  addToShoppingListFromConsole(product: Product) {
    this.productDb.addProduct(product); // Add to history first if not already there
    this.notificationService.showInfo(`Adding ${product.name} to shopping list.`, 'Console Action');
    this.speechService.speak(`Adding ${product.name} to shopping list.`);
    // Trigger AI interaction to confirm or ask for more details
    this.userInput = `Add "${product.name}" by "${product.brand}" to my shopping list.`;
    this.sendMessage();
  }

  addToFoodDiaryFromConsole(product: Product) {
    this.productDb.addProduct(product); // Add to history first if not already there
    this.notificationService.showInfo(`Adding ${product.name} to food diary.`, 'Console Action');
    this.speechService.speak(`Adding ${product.name} to food diary.`);
    // Trigger AI interaction to ask for meal type
    this.userInput = `Add "${product.name}" by "${product.brand}" to my food diary.`;
    this.sendMessage();
  }

  async handleBarcodeScannedFromChat(decodedText: string): Promise<void> {
    if (this.isProcessingCameraInput) return;
    this.isProcessingCameraInput = true;
    this.notificationService.showInfo('Barcode detected from chat camera! Processing...', 'Chat Scan');
    this.processingAbortController = new AbortController();

    try {
      const productInfo = await this.barcodeProcessorService.processBarcode(decodedText, this.processingAbortController.signal);
      if (this.processingAbortController.signal.aborted) throw new Error('Operation aborted');

      if (!productInfo) {
        this.notificationService.showWarning('Product not found or could not be processed.', 'Chat Scan Failed');
        this.audioService.playErrorSound();
        return;
      }

      const savedProduct = await this.productDb.addProduct(productInfo);
      if (!savedProduct) {
        return;
      }

      this.notificationService.showSuccess(`Scanned "${savedProduct.name}"!`, 'Chat Scan Success');
      this.speechService.speak(`I found ${savedProduct.name} by ${savedProduct.brand}. It's a ${savedProduct.verdict} choice.`);
      this.aiService.setLastDiscussedProduct(savedProduct);
      
      this.userInput = `I just scanned "${savedProduct.name}" by "${savedProduct.brand}". Its verdict is "${savedProduct.verdict}". Ingredients: ${savedProduct.ingredients.join(', ')}.`;
      await this.sendMessage();

    } catch (error: any) {
      if (error.message === 'Operation aborted') {
        this.notificationService.showInfo('Camera input processing cancelled.', 'Cancelled');
      } else {
        console.error('Barcode processing error from chat camera:', error);
        this.notificationService.showError('Failed to process barcode from chat camera.', 'Error');
        this.audioService.playErrorSound();
      }
    } finally {
      this.isProcessingCameraInput = false;
      this.processingAbortController = null;
      if (this.chatCameraFeed) {
        this.chatCameraFeed.resumeBarcodeScanning();
      }
    }
  }

  async handleImageCapturedFromChat(imageDataUrl: string): Promise<void> {
    if (this.isProcessingCameraInput) return;
    this.isProcessingCameraInput = true;
    this.notificationService.showInfo('Image captured from chat camera! Processing for OCR...', 'Chat OCR');
    this.processingAbortController = new AbortController();

    try {
      const productInfo = await this.ocrProcessorService.processImageForOcr(imageDataUrl, this.processingAbortController.signal);
      if (this.processingAbortController.signal.aborted) throw new Error('Operation aborted');

      if (!productInfo) {
        this.notificationService.showWarning('No product data extracted from image.', 'Chat OCR Failed');
        this.audioService.playErrorSound();
        return;
      }

      const savedProduct = await this.productDb.addProduct(productInfo);
      if (!savedProduct) {
        return;
      }

      this.notificationService.showSuccess(`Processed "${savedProduct.name}"!`, 'Chat OCR Success');
      this.speechService.speak(`I processed the label for ${savedProduct.name} by ${savedProduct.brand}. It's a ${savedProduct.verdict} choice.`);
      this.aiService.setLastDiscussedProduct(savedProduct);

      this.userInput = `I just captured and processed a label for "${savedProduct.name}" by "${savedProduct.brand}". Its verdict is "${savedProduct.verdict}". Ingredients: ${savedProduct.ingredients.join(', ')}.`;
      await this.sendMessage();

    } catch (error: any) {
      if (error.message === 'Operation aborted') {
        this.notificationService.showInfo('Camera input processing cancelled.', 'Cancelled');
      } else {
        console.error('OCR processing error from chat camera:', error);
        this.notificationService.showError('Failed to process image from chat camera.', 'Error');
        this.audioService.playErrorSound();
      }
    } finally {
      this.isProcessingCameraInput = false;
      this.processingAbortController = null;
      if (this.chatCameraFeed) {
        this.chatCameraFeed.resumeBarcodeScanning();
      }
    }
  }

  handleCameraClosedFromChat(): void {
    this.showCameraFeed = false;
    this.notificationService.showInfo('Camera closed.', 'Chat Camera');
    this.speechService.speak('Camera closed.');
    this.abortProcessing();
  }

  private abortProcessing(): void {
    if (this.processingAbortController) {
      this.processingAbortController.abort();
      this.processingAbortController = null;
    }
    this.isProcessingCameraInput = false;
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
        humanReadableToolCall: item.content.humanReadableToolCall,
        dynamicButtons: item.content.dynamicButtons,
        uiElements: item.content.uiElements
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
          humanReadableToolCall: message.humanReadableToolCall,
          dynamicButtons: message.dynamicButtons,
          uiElements: message.uiElements
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
          this.loadChatHistory();
          this.speechService.speak('Chat history cleared.');
        }
      },
      onCancel: () => {
        this.speechService.speak('Chat clearing cancelled.');
      }
    });
  }
}