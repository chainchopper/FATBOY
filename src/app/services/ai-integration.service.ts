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
    // Use Nirvana if available
    if (this.useNirvana) {
      try {
        const status = await this.nirvanaAdapter.checkAgentStatus();
        if (!status) {
          console.warn('[Intelligence System] Nirvana unavailable, falling back to legacy API');
          this.useNirvana = false;
        }
        return status;
      } catch (error) {
        console.error('[Intelligence System] Nirvana check failed, falling back to legacy API:', error);
        this.useNirvana = false;
      }
    }

    // Fallback to legacy API check
    const endpoint = `${this.apiBaseUrl}/v1/models`;
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Intelligence System] Legacy API check failed: ${response.status}: ${errorText}`);
        return false;
      }
      const data = await response.json();
      if (!data || !Array.isArray(data.data) || data.data.length === 0) {
        console.warn(`[Intelligence System] Legacy API returned empty model list`);
        return true; // Allow interaction even if model list is empty
      }
      return true;
    } catch (error) {
      console.error(`[Intelligence System] Could not connect to legacy API at ${endpoint}`, error);
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
    // Use Nirvana if available
    if (this.useNirvana) {
      try {
        const lastDiscussedProduct = this.productDbService.getLastViewedProduct();
        return await this.nirvanaAdapter.getChatCompletion(userInput, messagesHistory, lastDiscussedProduct);
      } catch (error) {
        console.error('[Intelligence System] Nirvana request failed, falling back to legacy API:', error);
        this.useNirvana = false;
        // Fall through to legacy implementation
      }
    }

    // Legacy implementation below
    const endpoint = `${this.apiBaseUrl}/v1/chat/completions`; // Added /v1
    if (!endpoint || !this.chatModelName) {
      this.notificationService.showError('AI Chat service not configured.', 'AI Error');
      return { text: "AI endpoint is not configured.", suggestedPrompts: [] };
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

    const lastDiscussedProduct = this.productDbService.getLastViewedProduct(); // Get from ProductDbService
    const userContext = await this.aiContextService.buildUserContext(lastDiscussedProduct);
    
    const systemMessage = `You are Fat Boy, an AI nutritional co-pilot.
    **CRITICAL: YOUR ENTIRE RESPONSE MUST BE A SINGLE, VALID JSON OBJECT AND NOTHING ELSE. NO INTRODUCTORY TEXT, NO EXPLANATIONS, NO MARKDOWN.
    The JSON object must have four keys:
    1. "response": (string) Your friendly, user-facing message. This must be natural, conversational, and contain no technical jargon.
    2. "suggestions": (array of 3 strings) Three unique, relevant, and diverse follow-up prompts for the user. These MUST be phrased as questions or commands from the user's perspective. For example, instead of "I can help summarize your food diary," use "Can you help me summarize my food diary?". These suggestions should be highly contextual to the current conversation and the user's profile/preferences.
    3. "dynamicButtons": (optional array of objects) If a multi-turn interaction is needed (e.g., after a tool call that requires further user input), provide an array of interactive buttons. Each button object must have "text" (string) and "action" (string, representing a follow-up command or intent).
    4. "uiElements": (optional array of objects) If you want to display rich UI components, provide an array of UI element objects. Each object must have "type" (string, e.g., "product_card") and "data" (object, the data for that UI component).
    **INSTRUCTIONS:**
    - Analyze the user's query and the provided context.
    - If the user's intent matches a tool, call the tool.
    - Use the tool's output to formulate your final "response" message.
    - Always provide 3 helpful "suggestions".
    - If a tool call requires further clarification or a "yes/no" confirmation from the user, generate "dynamicButtons" to guide the interaction. For example, after suggesting to add an item to a list, provide "Yes, add it!" and "No, cancel." buttons.
    - If the 'add_to_food_diary' tool is called without a 'meal_type', you MUST respond with dynamic buttons for meal selection (Breakfast, Lunch, Dinner, Snack, Drinks) and include the product_card UI element for context. The action for these buttons should be 'add_to_food_diary_meal_select' with the product details and selected meal_type in the payload.
    - If the user asks to scan something or open the camera, use the 'open_scanner' tool.
    - When a user asks for product alternatives or to find products, use the 'search_products' tool first. If it returns no results, you should then offer to search a wider, public database by calling the 'search_external_database' tool.
    - When the 'search_products' or 'search_external_database' tools return results, you MUST display them to the user using a 'product_card' UI element for each result. Formulate a response that introduces these results.
    - **IMPORTANT**: CONSIDER including a 'product_card' UI element in the 'uiElements' array if a specific product is the primary subject of the conversation or is being suggested. The 'data' for this 'product_card' should be the full 'Product' object.
    Example of a 'product_card' UI element:
    {
      "type": "product_card",
      "data": {
        "id": "some-product-id",
        "name": "Organic Apple",
        "brand": "Fresh Farms",
        "barcode": "1234567890",
        "ingredients": ["Organic Apple"],
        "calories": 95,
        "image": "https://example.com/apple.jpg",
        "verdict": "good",
        "flaggedIngredients": [],
        "scanDate": "2023-10-27T10:00:00.000Z",
        "ocrText": "ORGANIC APPLE",
        "categories": ["natural", "fruit"]
      }
    }
    Here is the current user's context:
    ${userContext}
    `;

    const messagesForApi = [
      { role: "system", content: systemMessage },
      ...messagesHistory
    ];

    const payload = {
      model: this.chatModelName,
      messages: messagesForApi,
      tools: this.tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 1024,
      stream: false
    };

    console.log('Sending AI chat completion request with payload:', JSON.stringify(payload, null, 2)); // Log full payload

    try {
      const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} ${errorText}`);
        this.notificationService.showError(`AI Chat Error: ${response.status} - ${errorText}`, 'AI Error');
        throw new Error(`API Error: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      if (!data || !Array.isArray(data.choices) || data.choices.length === 0) { // Robust check for data.choices
        console.error(`Chat Completion API Error: Unexpected response structure for chat completions endpoint:`, data);
        this.notificationService.showError('AI Chat Error: Invalid response structure.', 'AI Error');
        throw new Error('Invalid response from chat completion API.');
      }
      const choice = data.choices[0];

      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolExecutionResults: ToolExecutionResult[] = await Promise.all( // Specify type
          choice.message.tool_calls.map((tc: any) => this.toolExecutorService.executeTool(tc, lastDiscussedProduct))
        );

        if (toolExecutionResults.some(r => !r.output.startsWith('FAILED'))) this.audioService.playSuccessSound();

        const toolResponseMessages = [
          ...messagesForApi,
          choice.message,
          ...toolExecutionResults.map(result => ({
            role: "tool",
            tool_call_id: result.tool_call_id,
            content: result.output
          }))
        ];

        const toolResponsePayload = { ...payload, messages: toolResponseMessages };
        console.log('Sending AI tool response request with payload:', JSON.stringify(toolResponsePayload, null, 2)); // Log tool response payload
        const toolResponse = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(toolResponsePayload) });
        if (!toolResponse.ok) {
          const errorText = await toolResponse.text();
          console.error(`Tool Response API Error: ${toolResponse.status} ${errorText}`);
          this.notificationService.showError(`AI Tool Response Error: ${toolResponse.status} - ${errorText}`, 'AI Error');
          throw new Error(`Tool Response API Error: ${toolResponse.status} ${errorText}`);
        }

        const toolData = await toolResponse.json();
        if (!toolData || !Array.isArray(toolData.choices) || toolData.choices.length === 0) { // Robust check for toolData.choices
          console.error(`Tool Response API Error: Unexpected response structure for tool response endpoint:`, toolData);
          this.notificationService.showError('AI Tool Response Error: Invalid response structure.', 'AI Error');
          throw new Error('Invalid response from tool response API.');
        }
        const toolResponseMessage = toolData.choices[0].message.content;
        const parsedToolResponse = this._parseAiResponse(toolResponseMessage);
        
        // Combine dynamic buttons and UI elements from tool execution results with AI's parsed response
        const combinedDynamicButtons = toolExecutionResults.flatMap(res => res.dynamicButtons || []);
        const combinedUiElements = toolExecutionResults.flatMap(res => res.uiElements || []);

        return { 
          ...parsedToolResponse, 
          toolCalls: choice.message.tool_calls, 
          humanReadableToolCall: toolExecutionResults[0]?.humanReadableSummary || 'Performing an action...',
          dynamicButtons: combinedDynamicButtons.length > 0 ? combinedDynamicButtons : parsedToolResponse.dynamicButtons,
          uiElements: combinedUiElements.length > 0 ? combinedUiElements : parsedToolResponse.uiElements
        };
      }

      const parsedResponse = this._parseAiResponse(choice.message.content);
      return parsedResponse;
    } catch (error) {
      console.error('Error in getChatCompletion:', error);
      // A generic error message is already handled by the AgentConsoleComponent
      return {
        text: "Sorry, I couldn't connect to the AI service. Please ensure the model server is running and accessible.",
        suggestedPrompts: []
      };
    }
  }
}