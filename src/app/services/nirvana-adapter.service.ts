import { Injectable } from '@angular/core';
import { NirvanaService, NirvanaResponse, NirvanaConfig } from './nirvana.service';
import { AiContextService } from './ai-context.service';
import { ToolExecutorService, ToolExecutionResult } from './tool-executor.service';
import { AudioService } from './audio.service';
import { Product } from './product-db.service';
import { NotificationService } from './notification.service';
import { PreferencesService } from './preferences.service';
import { AiResponse, DynamicButton, UiElement } from './ai-integration.service';
import { firstValueFrom } from 'rxjs';

/**
 * NirvanaAdapterService
 * 
 * This service adapts the existing AI integration interface to use Nirvana.
 * It maintains backward compatibility with the existing application while providing
 * enhanced real-time capabilities.
 */
@Injectable({
  providedIn: 'root'
})
export class NirvanaAdapterService {
  private isInitialized = false;
  private conversationHistory: Array<{ role: 'user' | 'model'; content: string }> = [];
  private currentResponse: Partial<AiResponse> = {};
  private isProcessingResponse = false;
  private videoStream: MediaStream | null = null;
  private frameCaptureInterval: any = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(
    private nirvanaService: NirvanaService,
    private aiContextService: AiContextService,
    private toolExecutorService: ToolExecutorService,
    private audioService: AudioService,
    private notificationService: NotificationService,
    private preferencesService: PreferencesService
  ) {
    // Subscribe to Nirvana responses
    this.nirvanaService.responses.subscribe(response => {
      this.handleNirvanaResponse(response);
    });

    // Subscribe to connection status
    this.nirvanaService.connectionStatus$.subscribe(connected => {
      if (connected && !this.isInitialized) {
        this.initializeSession();
      }
    });

    // Subscribe to errors
    this.nirvanaService.errors$.subscribe(error => {
      console.error('[NirvanaAdapter] Error:', error);
    });
  }

  /**
   * Initialize Nirvana session with tools and system instructions
   */
  private async initializeSession(): Promise<void> {
    if (this.isInitialized) return;

    // Define tools in Nirvana format (converted from existing tools)
    const tools = this.convertToolsToNirvanaFormat();

    // Build system instruction
    const systemInstruction = this.buildSystemInstruction();

    // Register tools with Nirvana
    this.nirvanaService.registerTools(tools, systemInstruction);

    this.isInitialized = true;
    console.log('[NirvanaAdapter] Session initialized');
  }

  /**
   * Check if Nirvana is available and ready
   */
  async checkAgentStatus(): Promise<boolean> {
    try {
      // Get user preferences for Nirvana configuration
      const prefs = this.preferencesService.getPreferences();

      // Attempt to connect if not already connected
      if (!this.nirvanaService.isReady()) {
        const connected = await this.nirvanaService.connect({
          enableAudio: prefs.nirvanaEnableAudio ?? true,
          enableThinkingMode: prefs.nirvanaEnableThinking ?? false,
          enableGrounding: prefs.nirvanaEnableGrounding ?? false,
          voice: prefs.nirvanaVoice ?? 'Puck',
          language: prefs.nirvanaLanguage ?? 'en-US'
        });

        if (!connected) {
          return false;
        }
      }

      return this.nirvanaService.isReady();
    } catch (error) {
      console.error('[NirvanaAdapter] Status check failed:', error);
      return false;
    }
  }

  /**
   * Get chat completion (main entry point for AI interactions)
   */
  async getChatCompletion(
    userInput: string,
    messagesHistory: any[] = [],
    lastDiscussedProduct?: Product | null
  ): Promise<AiResponse> {
    // Ensure connection is established
    if (!this.nirvanaService.isReady()) {
      await this.checkAgentStatus();
    }

    // Reset current response accumulator
    this.currentResponse = {
      text: '',
      suggestedPrompts: [],
      toolCalls: [],
      dynamicButtons: [],
      uiElements: []
    };
    this.isProcessingResponse = true;

    try {
      // Build context-enriched message
      const userContext = await this.aiContextService.buildUserContext(lastDiscussedProduct || null);
      const enrichedMessage = `${userInput}\n\nContext: ${userContext}`;

      // Send message to Nirvana
      await this.nirvanaService.sendText(enrichedMessage);

      // Wait for complete response (with timeout)
      const response = await this.waitForCompleteResponse(30000); // 30 second timeout

      return response;
    } catch (error) {
      console.error('[NirvanaAdapter] Chat completion error:', error);
      this.notificationService.showError(
        'Unable to process your request. Please try again.',
        'Intelligence System'
      );

      return {
        text: "I'm having trouble connecting right now. Please check your connection and try again.",
        suggestedPrompts: ['Try again', 'Check system status', 'View help']
      };
    } finally {
      this.isProcessingResponse = false;
    }
  }

  /**
   * Wait for complete response from Nirvana
   */
  private async waitForCompleteResponse(timeout: number): Promise<AiResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, timeout);

      const checkComplete = () => {
        if (!this.isProcessingResponse) {
          clearTimeout(timeoutId);
          resolve(this.buildFinalResponse());
        } else {
          setTimeout(checkComplete, 100);
        }
      };

      checkComplete();
    });
  }

  /**
   * Handle incoming Nirvana responses
   */
  private async handleNirvanaResponse(response: NirvanaResponse): Promise<void> {
    // Accumulate text response
    if (response.text) {
      this.currentResponse.text = (this.currentResponse.text || '') + response.text;
    }

    // Handle tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        await this.executeToolCall(toolCall);
      }
    }

    // Mark as complete when turn is complete
    if (response.turnComplete) {
      this.isProcessingResponse = false;
    }
  }

  /**
   * Execute tool call and send result back to Nirvana
   */
  private async executeToolCall(toolCall: { id: string; name: string; args: any }): Promise<void> {
    try {
      // Handle streaming control tools directly
      if (toolCall.name === 'enable_camera_stream') {
        const success = await this.startCameraStream();
        await this.nirvanaService.sendToolResponse(toolCall.id, toolCall.name, {
          success,
          output: success ? 'Camera streaming started.' : 'Failed to start camera stream.'
        });
        return;
      }
      if (toolCall.name === 'disable_camera_stream') {
        this.stopVideoStream();
        await this.nirvanaService.sendToolResponse(toolCall.id, toolCall.name, {
          success: true,
          output: 'Camera streaming stopped.'
        });
        return;
      }
      if (toolCall.name === 'enable_screen_share_stream') {
        const success = await this.startScreenStream();
        await this.nirvanaService.sendToolResponse(toolCall.id, toolCall.name, {
          success,
          output: success ? 'Screen sharing started.' : 'Failed to start screen share.'
        });
        return;
      }
      if (toolCall.name === 'disable_screen_share_stream') {
        this.stopVideoStream();
        await this.nirvanaService.sendToolResponse(toolCall.id, toolCall.name, {
          success: true,
          output: 'Screen sharing stopped.'
        });
        return;
      }

      // Convert to format expected by ToolExecutorService
      const toolCallFormatted = {
        function: {
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.args)
        }
      };

      // Execute the tool
      const result = await this.toolExecutorService.executeTool(
        toolCallFormatted,
        null // lastDiscussedProduct would be passed from context
      );

      // Play success sound if tool execution succeeded
      if (!result.output.startsWith('FAILED')) {
        this.audioService.playSuccessSound();
      }

      // Accumulate dynamic buttons and UI elements from tool execution
      if (result.dynamicButtons) {
        this.currentResponse.dynamicButtons = [
          ...(this.currentResponse.dynamicButtons || []),
          ...result.dynamicButtons
        ];
      }

      if (result.uiElements) {
        this.currentResponse.uiElements = [
          ...(this.currentResponse.uiElements || []),
          ...result.uiElements
        ];
      }

      // Send tool result back to Nirvana
      await this.nirvanaService.sendToolResponse(toolCall.id, toolCall.name, {
        success: !result.output.startsWith('FAILED'),
        output: result.output,
        humanReadable: result.humanReadableSummary
      });

    } catch (error) {
      console.error('[NirvanaAdapter] Tool execution error:', error);

      // Send error back to Nirvana
      await this.nirvanaService.sendToolResponse(toolCall.id, toolCall.name, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Build final AI response from accumulated data
   */
  private buildFinalResponse(): AiResponse {
    // Parse the accumulated text to extract JSON response if present
    const parsedResponse = this.parseResponseText(this.currentResponse.text || '');

    return {
      text: parsedResponse.text || this.currentResponse.text || '',
      suggestedPrompts: parsedResponse.suggestions || this.generateDefaultSuggestions(),
      toolCalls: this.currentResponse.toolCalls,
      dynamicButtons: this.currentResponse.dynamicButtons,
      uiElements: this.currentResponse.uiElements
    };
  }

  /**
   * Parse response text to extract structured data
   */
  private parseResponseText(text: string): { text: string; suggestions: string[] } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          text: parsed.response || text,
          suggestions: parsed.suggestions || []
        };
      }

      // Try parsing the whole text as JSON
      const parsed = JSON.parse(text);
      return {
        text: parsed.response || text,
        suggestions: parsed.suggestions || []
      };
    } catch {
      // If not JSON, return as-is
      return {
        text,
        suggestions: []
      };
    }
  }

  /**
   * Generate default suggestions
   */
  private generateDefaultSuggestions(): string[] {
    return [
      'What can you help me with?',
      'Show me my shopping list',
      'Suggest a healthy meal'
    ];
  }

  /**
   * Convert existing tools to Nirvana format
   */
  private convertToolsToNirvanaFormat(): any[] {
    // These match the existing tools from ai-integration.service.ts
    return [
      {
        name: 'add_to_food_diary',
        description: 'Adds a food product to the user\'s food diary for a specific meal type.',
        parameters: {
          type: 'object',
          properties: {
            product_name: {
              type: 'string',
              description: 'The name of the food product to add.'
            },
            brand: {
              type: 'string',
              description: 'The brand of the food product.'
            },
            meal_type: {
              type: 'string',
              enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drinks'],
              description: 'The meal type. Optional - if not provided, AI should prompt user.'
            }
          },
          required: ['product_name', 'brand']
        }
      },
      {
        name: 'add_to_shopping_list',
        description: 'Adds a food product to the user\'s shopping list.',
        parameters: {
          type: 'object',
          properties: {
            product_name: {
              type: 'string',
              description: 'The name of the food product to add.'
            },
            brand: {
              type: 'string',
              description: 'The brand of the food product.'
            }
          },
          required: ['product_name', 'brand']
        }
      },
      {
        name: 'remove_from_shopping_list',
        description: 'Removes a food product from the user\'s shopping list.',
        parameters: {
          type: 'object',
          properties: {
            product_name: {
              type: 'string',
              description: 'The name of the food product to remove.'
            }
          },
          required: ['product_name']
        }
      },
      {
        name: 'update_avoided_ingredients',
        description: 'Adds or removes ingredients from the user\'s avoided ingredients list.',
        parameters: {
          type: 'object',
          properties: {
            add: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of ingredients to add to avoid list.'
            },
            remove: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of ingredients to remove from avoid list.'
            }
          }
        }
      },
      {
        name: 'summarize_food_diary',
        description: 'Summarizes the user\'s food diary for a specific date.',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format. Defaults to today if not provided.'
            }
          }
        }
      },
      {
        name: 'open_scanner',
        description: 'Opens the unified scanner to scan barcodes or food labels.',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'search_products',
        description: 'Searches the user\'s local product database.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query (e.g., "healthy bread").'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'search_external_database',
        description: 'Searches the public Open Food Facts database. Use as fallback if local search returns no results.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query.'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'enable_camera_stream',
        description: 'Starts the camera and streams the video to Nirvana for real-time visual recognition.',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'disable_camera_stream',
        description: 'Stops the camera stream.',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'enable_screen_share_stream',
        description: 'Starts screen sharing and streams the video to Nirvana for real-time visual recognition of the screen.',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'disable_screen_share_stream',
        description: 'Stops the screen share stream.',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  /**
   * Build system instruction for Nirvana
   */
  private buildSystemInstruction(): string {
    return `You are Fat Boy, a friendly and knowledgeable nutritional co-pilot helping users make informed food choices.

RESPONSE FORMAT:
Your responses should be in JSON format with the following structure:
{
  "response": "Your friendly, conversational message to the user",
  "suggestions": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"]
}

PERSONALITY:
- Be warm, encouraging, and supportive
- Use casual, friendly language
- Show enthusiasm about healthy choices
- Be empathetic when users make less healthy choices
- Never be judgmental or preachy

CAPABILITIES:
- Analyze food products and ingredients
- Add items to shopping lists and food diary
- Search for product alternatives
- Provide personalized nutritional advice
- Help users understand ingredient labels

GUIDELINES:
- Always provide 3 relevant follow-up suggestions
- Phrase suggestions as questions from the user's perspective
- Use the provided tools when appropriate
- Consider the user's context and preferences
- Keep responses concise but informative
- Never mention "Gemini", "Google", or technical details to users

When analyzing products, focus on:
- Ingredients the user wants to avoid
- Calorie content vs their goals
- Overall nutritional value
- Healthier alternatives when applicable`;
  }

  /**
   * Update voice configuration
   */
  updateVoice(voiceName: string): void {
    this.nirvanaService.updateConfig({
      voice: voiceName
    });

    // Save to preferences
    const prefs = this.preferencesService.getPreferences();
    this.preferencesService.savePreferences({
      ...prefs,
      nirvanaVoice: voiceName
    });
  }

  /**
   * Enable/disable audio features
   */
  setAudioEnabled(enabled: boolean): void {
    this.nirvanaService.updateConfig({
      enableAudio: enabled
    });

    // Save to preferences
    const prefs = this.preferencesService.getPreferences();
    this.preferencesService.savePreferences({
      ...prefs,
      nirvanaEnableAudio: enabled
    });
  }

  /**
   * Enable/disable thinking mode
   */
  setThinkingMode(enabled: boolean): void {
    this.nirvanaService.updateConfig({
      enableThinkingMode: enabled
    });

    // Save to preferences
    const prefs = this.preferencesService.getPreferences();
    this.preferencesService.savePreferences({
      ...prefs,
      nirvanaEnableThinking: enabled
    });
  }

  /**
   * Enable/disable grounding (Google Search)
   */
  setGroundingEnabled(enabled: boolean): void {
    this.nirvanaService.updateConfig({
      enableGrounding: enabled
    });

    // Save to preferences
    const prefs = this.preferencesService.getPreferences();
    this.preferencesService.savePreferences({
      ...prefs,
      nirvanaEnableGrounding: enabled
    });
  }

  /**
   * Start streaming camera video to Nirvana
   */
  async startCameraStream(): Promise<boolean> {
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      this.startFrameCapture();
      this.notificationService.showSuccess('Camera streaming to Nirvana started', 'Video Intelligence');
      return true;
    } catch (error) {
      console.error('[NirvanaAdapter] Failed to start camera stream:', error);
      this.notificationService.showError('Could not access camera for streaming.', 'Video Error');
      return false;
    }
  }

  /**
   * Start streaming screen share to Nirvana
   */
  async startScreenStream(): Promise<boolean> {
    try {
      this.videoStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true
      });
      this.startFrameCapture();
      this.notificationService.showSuccess('Screen share streaming to Nirvana started', 'Screen Intelligence');
      return true;
    } catch (error) {
      console.error('[NirvanaAdapter] Failed to start screen stream:', error);
      this.notificationService.showError('Could not start screen share for streaming.', 'Screen Error');
      return false;
    }
  }

  /**
   * Stop all video streaming
   */
  stopVideoStream(): void {
    if (this.frameCaptureInterval) {
      clearInterval(this.frameCaptureInterval);
      this.frameCaptureInterval = null;
    }

    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    this.notificationService.showInfo('Video streaming stopped.', 'Intelligence');
  }

  /**
   * Start capturing frames from the stream and sending them to Nirvana
   */
  private startFrameCapture(): void {
    if (!this.videoStream) return;

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }

    const video = document.createElement('video');
    video.srcObject = this.videoStream;
    video.play();

    // Capture a frame every 1 second (Live API recommends low frequency for video)
    this.frameCaptureInterval = setInterval(() => {
      if (!this.videoStream || !this.videoStream.active) {
        this.stopVideoStream();
        return;
      }

      const context = this.canvas!.getContext('2d');
      if (context && video.videoWidth > 0) {
        this.canvas!.width = 640;
        this.canvas!.height = 480;
        context.drawImage(video, 0, 0, 640, 480);

        // Get JPEG base64 (remove data:image/jpeg;base64, prefix)
        const dataUrl = this.canvas!.toDataURL('image/jpeg', 0.6);
        const base64Data = dataUrl.split(',')[1];

        this.nirvanaService.sendVideoFrame(base64Data);
      }
    }, 1000);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopVideoStream();
    this.nirvanaService.disconnect();
    this.isInitialized = false;
    this.conversationHistory = [];
  }
}
