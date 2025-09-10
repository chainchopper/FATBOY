import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Product } from './product-db.service';
import { AudioService } from './audio.service';
import { AiContextService } from './ai-context.service';
import { ToolExecutorService } from './tool-executor.service';

interface DynamicButton {
  text: string;
  action: string; // e.g., 'add_to_shopping_list', 'add_to_food_diary'
  payload?: any; // Data needed for the action
}

export interface AiResponse {
  text: string;
  suggestedPrompts: string[];
  toolCalls?: any[];
  humanReadableToolCall?: string;
  dynamicButtons?: DynamicButton[]; // New: for interactive buttons
}

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  private apiBaseUrl = environment.openaiApiBaseUrl;
  private apiKey = environment.openaiApiKey;
  private chatModelName = environment.chatModelName;
  private embeddingModelName = environment.embeddingModelName;

  private lastDiscussedProduct: Product | null = null;

  constructor(
    private audioService: AudioService,
    private aiContextService: AiContextService,
    private toolExecutorService: ToolExecutorService
  ) { }

  async checkAgentStatus(): Promise<boolean> {
    const endpoint = `${this.apiBaseUrl}/models`;
    try {
      const response = await fetch(endpoint);
      if (!response.ok) return false;
      const data = await response.json();
      const models = data.data.map((m: any) => m.id);
      // Check if both chat model and Moonbeam2 are available
      return models.includes(this.chatModelName) && models.includes('Moonbeam2');
    } catch (error) {
      console.error(`[AI STATUS CHECK FAILED]: Could not connect to ${endpoint}. Is the server running?`, error);
      return false;
    }
  }

  async getEmbeddings(text: string): Promise<number[]> {
    const endpoint = `${this.apiBaseUrl}/embeddings`;
    if (!endpoint || !this.embeddingModelName) {
      console.warn("Embedding endpoint or model name not configured.");
      return [];
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: this.embeddingModelName,
      input: text
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Embeddings API Error:', response.status, errorBody);
        return [];
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Network or other error calling Embeddings API:', error);
      return [];
    }
  }

  private tools = [
    {
      type: "function",
      function: {
        name: "add_to_food_diary",
        description: "Adds a food product to the user's food diary for a specific meal type. Requires product name, brand, and meal type.",
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
              description: "The meal type (e.g., Breakfast, Lunch, Dinner, Snack, Drinks)."
            }
          },
          required: ["product_name", "brand", "meal_type"]
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
    }
  ];

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
    const parsedJson = this._extractJson(fullResponseText);
    const defaultSuggestions = ["How can I help?", "What's in my shopping list?", "Suggest a healthy dinner."];
    if (parsedJson && parsedJson.response) {
      return {
        text: parsedJson.response,
        suggestedPrompts: Array.isArray(parsedJson.suggestions) ? parsedJson.suggestions.slice(0, 3) : defaultSuggestions,
        dynamicButtons: Array.isArray(parsedJson.dynamicButtons) ? parsedJson.dynamicButtons : undefined
      };
    } else {
      const cleanedText = fullResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return {
        text: cleanedText || "I'm sorry, I had trouble formatting my response. Please try again.",
        suggestedPrompts: defaultSuggestions
      };
    }
  }

  async getChatCompletion(userInput: string, messagesHistory: any[] = []): Promise<AiResponse> {
    const endpoint = `${this.apiBaseUrl}/chat/completions`;
    if (!endpoint || !this.chatModelName) {
      return { text: "AI endpoint is not configured.", suggestedPrompts: [] };
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

    const userContext = await this.aiContextService.buildUserContext(this.lastDiscussedProduct);
    
    const systemMessage = `You are Fat Boy, an AI nutritional co-pilot.
    **CRITICAL: YOUR ENTIRE RESPONSE MUST BE A SINGLE, VALID JSON OBJECT AND NOTHING ELSE. NO INTRODUCTORY TEXT, NO EXPLANATIONS, NO MARKDOWN.
    The JSON object must have three keys:
    1. "response": (string) Your friendly, user-facing message. This must be natural, conversational, and contain no technical jargon.
    2. "suggestions": (array of 3 strings) Three unique, relevant, and diverse follow-up prompts for the user.
    3. "dynamicButtons": (optional array of objects) If a multi-turn interaction is needed (e.g., after a tool call that requires further user input), provide an array of interactive buttons. Each button object must have "text" (string) and "action" (string, representing a follow-up command or intent).
    **INSTRUCTIONS:**
    - Analyze the user's query and the provided context.
    - If the user's intent matches a tool, call the tool.
    - Use the tool's output to formulate your final "response" message.
    - Always provide 3 helpful "suggestions".
    - If a tool call requires further clarification or a "yes/no" confirmation from the user, generate "dynamicButtons" to guide the interaction. For example, after suggesting to add an item to a list, provide "Yes, add it!" and "No, cancel." buttons.
    Here is the current user's context:
    ${userContext}
    `;

    const messagesForApi = [
      { role: 'system', content: systemMessage },
      ...messagesHistory.filter(msg => msg.content && msg.role).map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.toolCalls && { tool_calls: msg.toolCalls })
      })),
      { role: 'user', content: userInput }
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

    try {
      const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
      
      const data = await response.json();
      const choice = data.choices[0];

      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolExecutionResults = await Promise.all(
          choice.message.tool_calls.map((tc: any) => this.toolExecutorService.executeTool(tc, this.lastDiscussedProduct))
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
        const toolResponse = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(toolResponsePayload) });
        if (!toolResponse.ok) throw new Error(`Tool Response API Error: ${toolResponse.status} ${await toolResponse.text()}`);

        const toolData = await toolResponse.json();
        const toolResponseMessage = toolData.choices[0].message.content;
        const parsedToolResponse = this._parseAiResponse(toolResponseMessage);
        
        return { 
          ...parsedToolResponse, 
          toolCalls: choice.message.tool_calls, 
          humanReadableToolCall: toolExecutionResults[0]?.humanReadableSummary || 'Performing an action...'
        };
      }

      return this._parseAiResponse(choice.message.content);

    } catch (error) {
      console.error('Error in getChatCompletion:', error);
      return {
        text: "Sorry, I couldn't connect to the AI service. Please ensure the model server is running.",
        suggestedPrompts: []
      };
    }
  }

  setLastDiscussedProduct(product: Product | null): void {
    this.lastDiscussedProduct = product;
  }

  getLastDiscussedProduct(): Product | null {
    return this.lastDiscussedProduct;
  }
}