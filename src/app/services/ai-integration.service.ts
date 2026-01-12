import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Product, ProductDbService } from './product-db.service'; // Import ProductDbService
import { AudioService } from './audio.service';
import { AiContextService } from './ai-context.service';
import { ToolExecutorService, ToolExecutionResult } from './tool-executor.service'; // Import ToolExecutionResult
import { firstValueFrom } from 'rxjs'; // Import firstValueFrom
import { NotificationService } from './notification.service'; // Import NotificationService
import { NirvanaAdapterService } from './nirvana-adapter.service'; // Import Nirvana adapter

export interface DynamicButton {
  text: string;
  action: string;
  payload?: any;
}

// Define UI Element interfaces
export interface UiElement { // Exported for use in ToolExecutorService
  type: string; // e.g., 'product_card'
  data: any; // The data for the specific UI element
}

export interface AiResponse {
  text: string;
  suggestedPrompts: string[];
  toolCalls?: any[];
  humanReadableToolCall?: string;
  dynamicButtons?: DynamicButton[];
  uiElements?: UiElement[]; // New: for rich UI elements
}

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  // Legacy API configuration (deprecated)
  private apiBaseUrl = environment.openaiApiBaseUrl;
  private apiKey = environment.openaiApiKey;
  private chatModelName = environment.chatModelName;
  private embeddingModelName = environment.embeddingModelName;
  
  // Use Nirvana by default if API key is configured
  private useNirvana = !!environment.geminiApiKey && environment.geminiApiKey !== 'your_gemini_api_key_here';

  constructor(
    private audioService: AudioService,
    private aiContextService: AiContextService,
    private toolExecutorService: ToolExecutorService,
    private productDbService: ProductDbService, // Inject ProductDbService
    private notificationService: NotificationService, // Inject NotificationService
    private nirvanaAdapter: NirvanaAdapterService // Inject Nirvana adapter
  ) {
    console.log(`[Intelligence System] Using ${this.useNirvana ? 'Nirvana' : 'Legacy API'}`);
  }

  async checkAgentStatus(): Promise<boolean> {
    // Nirvana is hardwired - only check Nirvana status
    try {
      const status = await this.nirvanaAdapter.checkAgentStatus();
      if (!status) {
        console.warn('[Intelligence System] Nirvana unavailable. Please configure GEMINI_API_KEY in .env');
      }
      return status;
    } catch (error) {
      console.error('[Intelligence System] Nirvana connection failed:', error);
      return false;
    }
  }

  private tools = [
    {
      type: "function",
      function: {
        name: "add_to_food_diary",
        description: "Adds a food product to the user's food diary for a specific meal type. If meal_type is not provided, the AI should ask the user to select one using dynamic buttons.",
        parameters: {
          type: "object",
          properties: {
            product_name: {
              type: "string",
              description: "The name of the food product to add."
            },
            brand: {
              type: "string",
              description: "The brand of the food product."
            },
            meal_type: {
              type: "string",
              enum: ["Breakfast", "Lunch", "Dinner", "Snack", "Drinks"],
              description: "The meal type (e.g., Breakfast, Lunch, Dinner, Snack, Drinks). This parameter is optional. If not provided, the AI should prompt the user for it."
            }
          },
          required: ["product_name", "brand"] // meal_type is now optional
        }
      }
    },
    {
      type: "function",
      function: {
        name: "add_to_shopping_list",
        description: "Adds a food product to the user's shopping list. Requires product name and brand.",
        parameters: {
          type: "object",
          properties: {
            product_name: {
              type: "string",
              description: "The name of the food product to add."
            },
            brand: {
              type: "string",
              description: "The brand of the food product."
            }
          },
          required: ["product_name", "brand"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "remove_from_shopping_list",
        description: "Removes a food product from the user's shopping list. Requires the product name.",
        parameters: {
          type: "object",
          properties: {
            product_name: {
              type: "string",
              description: "The name of the food product to remove."
            }
          },
          required: ["product_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_avoided_ingredients",
        description: "Adds or removes ingredients from the user's avoided ingredients list.",
        parameters: {
          type: "object",
          properties: {
            add: {
              type: "array",
              items: { "type": "string" },
              description: "A list of ingredients to add to the avoid list."
            },
            remove: {
              type: "array",
              items: { "type": "string" },
              description: "A list of ingredients to remove from the avoid list."
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "summarize_food_diary",
        description: "Summarizes the user's food diary for a specific date, including total calories and flagged ingredients.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "The date to summarize in YYYY-MM-DD format. Defaults to today if not provided."
            }
          },
        }
      }
    },
    {
      type: "function",
      function: {
        name: "open_scanner",
        description: "Opens the unified scanner to allow the user to scan a barcode or food label.",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "search_products",
        description: "Searches the user's local product database for items matching a query. Useful for finding alternatives or specific types of products.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query (e.g., 'healthy bread', 'low calorie snacks')."
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "search_external_database",
        description: "Searches the public Open Food Facts database for products matching a query. Use this as a fallback if 'search_products' returns no results.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query (e.g., 'healthy bread', 'low calorie snacks')."
            }
          },
          required: ["query"]
        }
      }
    }
  ];

  private _extractJsonFromMarkdown(text: string): any | null {
    const regex = /```(?:json)?\s*([\s\S]*?)```/;
    const match = text.match(regex);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        console.error("Failed to parse extracted JSON from Markdown:", match[1], error);
        return null;
      }
    }
    return null;
  }

  private _extractJson(text: string): any | null {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) return null;
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Failed to parse extracted JSON string:", jsonString, error);
      return null;
    }
  }

  private _parseAiResponse(fullResponseText: string): AiResponse {
    let parsedJson: any = null;
    try {
        // Try to extract JSON from markdown first
        parsedJson = this._extractJsonFromMarkdown(fullResponseText);
        if (!parsedJson) {
            // If not found in markdown, try to extract raw JSON
            parsedJson = this._extractJson(fullResponseText);
        }
    } catch (e) {
        console.error("Error during initial JSON extraction:", e);
        // Fallback to treating the whole thing as text
        parsedJson = null;
    }

    const defaultSuggestions = ["How can I help?", "What's in my shopping list?", "Suggest a healthy dinner."];

    if (parsedJson && typeof parsedJson === 'object' && parsedJson.response) {
        return {
            text: parsedJson.response,
            suggestedPrompts: Array.isArray(parsedJson.suggestions) ? parsedJson.suggestions.slice(0, 3) : defaultSuggestions,
            dynamicButtons: Array.isArray(parsedJson.dynamicButtons) ? parsedJson.dynamicButtons : undefined,
            uiElements: Array.isArray(parsedJson.uiElements) ? parsedJson.uiElements : undefined
        };
    } else {
        // If JSON parsing failed or didn't contain 'response', treat the whole thing as text
        const cleanedText = fullResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
        console.warn("AI response did not contain expected JSON structure or 'response' key. Raw response:", fullResponseText);
        this.notificationService.showWarning("AI response format was unexpected. Displaying raw text.", "AI Response Warning");
        return {
            text: cleanedText || "I'm sorry, I had trouble understanding the AI's response. Please try again.",
            suggestedPrompts: defaultSuggestions
        };
    }
  }

  async getChatCompletion(userInput: string, messagesHistory: any[] = []): Promise<AiResponse> {
    // Nirvana is hardwired - only use Nirvana
    try {
      const lastDiscussedProduct = this.productDbService.getLastViewedProduct();
      return await this.nirvanaAdapter.getChatCompletion(userInput, messagesHistory, lastDiscussedProduct);
    } catch (error) {
      console.error('[Intelligence System] Nirvana request failed:', error);
      this.notificationService.showError('Unable to connect to intelligence system.', 'Connection Error');
      return { 
        text: "I'm having trouble connecting. Please ensure GEMINI_API_KEY is configured in .env", 
        suggestedPrompts: [] 
      };
    }
  }
}