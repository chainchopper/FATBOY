import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { supabase } from '../../integrations/supabase/client';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { DynamicButton, UiElement, AiIntegrationService } from './ai-integration.service'; // Import AiIntegrationService

// Define the Message interface here, as it's central to chat history
export interface ChatMessage {
  sender: 'user' | 'agent' | 'tool';
  text: string;
  timestamp: Date;
  avatar: string;
  suggestedPrompts?: string[];
  toolCalls?: any[];
  humanReadableToolCall?: string;
  dynamicButtons?: DynamicButton[];
  uiElements?: UiElement[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatHistoryService {
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  private currentUserId: string | null = null;
  private userAvatar: string = 'https://api.dicebear.com/8.x/initials/svg?seed=Anonymous';
  private agentAvatar: string = 'assets/logo64.png';

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private aiService: AiIntegrationService // Inject AiIntegrationService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      if (user) {
        this.profileService.getProfile().subscribe(profile => {
          const userName = profile?.first_name || user.email?.split('@')[0] || 'You';
          this.userAvatar = profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${userName}`;
          this.loadChatHistory();
        });
      } else {
        this.userAvatar = 'https://api.dicebear.com/8.x/initials/svg?seed=Anonymous';
        this.messagesSubject.next([]); // Clear messages if logged out
      }
    });
  }

  public async loadChatHistory(): Promise<void> {
    if (!this.currentUserId) {
      this.messagesSubject.next([]);
      return;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('sender, content, created_at')
      .eq('user_id', this.currentUserId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading chat history:', error);
      this.messagesSubject.next([]);
      return;
    }

    if (data && data.length > 0) {
      const loadedMessages: ChatMessage[] = data.map((item: any) => ({
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
      this.messagesSubject.next(loadedMessages);
    } else {
      // Initial greeting for new chat - now fetched from AI
      const userProfile = await firstValueFrom(this.profileService.getProfile());
      const userName = userProfile?.first_name || 'there';

      try {
        const initialAiResponse = await this.aiService.getChatCompletion(`Hello, I am ${userName}. How can you help me today?`);
        const initialMessage: ChatMessage = {
          sender: 'agent',
          text: initialAiResponse.text,
          timestamp: new Date(),
          avatar: this.agentAvatar,
          suggestedPrompts: initialAiResponse.suggestedPrompts,
          dynamicButtons: initialAiResponse.dynamicButtons,
          uiElements: initialAiResponse.uiElements
        };
        this.messagesSubject.next([initialMessage]);
        this.saveMessage(initialMessage); // Save initial greeting
      } catch (aiError) {
        console.error('Error fetching initial AI greeting:', aiError);
        const fallbackMessage: ChatMessage = {
          sender: 'agent',
          text: `Hello ${userName}! I am Fat Boy, your personal AI co-pilot. I'm having trouble connecting to my brain right now, but I'm here to help!`,
          timestamp: new Date(),
          avatar: this.agentAvatar,
          suggestedPrompts: [
            'Can you scan a product for me?',
            'What are my top avoided ingredients?',
            'Can you show me my shopping list?'
          ]
        };
        this.messagesSubject.next([fallbackMessage]);
        this.saveMessage(fallbackMessage);
      }
    }
  }

  public async saveMessage(message: ChatMessage): Promise<void> {
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

  public async clearChatHistory(): Promise<void> {
    if (!this.currentUserId) return;

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('Error clearing chat history:', error);
    } else {
      this.loadChatHistory(); // Reload to show new initial greeting
    }
  }

  public getMessages(): ChatMessage[] {
    return this.messagesSubject.getValue();
  }

  public addUserMessage(text: string): ChatMessage {
    const message: ChatMessage = {
      sender: 'user',
      text,
      timestamp: new Date(),
      avatar: this.userAvatar
    };
    const currentMessages = this.messagesSubject.getValue();
    this.messagesSubject.next([...currentMessages, message]);
    this.saveMessage(message);
    return message;
  }

  public addAgentMessage(aiResponse: any): ChatMessage {
    const message: ChatMessage = {
      sender: 'agent',
      text: aiResponse.text,
      timestamp: new Date(),
      avatar: this.agentAvatar,
      suggestedPrompts: aiResponse.suggestedPrompts,
      toolCalls: aiResponse.toolCalls,
      humanReadableToolCall: aiResponse.humanReadableToolCall,
      dynamicButtons: aiResponse.dynamicButtons,
      uiElements: aiResponse.uiElements
    };
    const currentMessages = this.messagesSubject.getValue();
    this.messagesSubject.next([...currentMessages, message]);
    this.saveMessage(message);
    return message;
  }
}