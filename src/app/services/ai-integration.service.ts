import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ProductDbService, Product } from './product-db.service';
import { ProfileService } from './profile.service';
import { PreferencesService } from './preferences.service';
import { ShoppingListService, ShoppingListItem } from './shopping-list.service';
import { FoodDiaryService, MealType } from './food-diary.service';
import { GamificationService } from './gamification.service';
import { NotificationService } from './notification.service';
import { AudioService } from './audio.service';
import { firstValueFrom } from 'rxjs';

export interface AiResponse {
  text: string;
  suggestedPrompts: string[]; // Renamed from followUpQuestions
  toolCalls?: any[];
  humanReadableToolCall?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  private apiBaseUrl = environment.openaiApiBaseUrl;
  private apiKey = environment.openaiApiKey;
  private chatModelName = environment.chatModelName;
  private embeddingModelName = environment.embeddingModelName;

  // Store the last product discussed for easy tool integration
  private lastDiscussedProduct: Product | null = null;

  constructor(
    private productDb: ProductDbService,
    private profileService: ProfileService,
    private preferencesService: PreferencesService,
    private shoppingListService: ShoppingListService,
    private foodDiaryService: FoodDiaryService,
    private gamificationService: GamificationService,
    private notificationService: NotificationService,
    private audioService: AudioService
  ) { }

  async checkAgentStatus(): Promise<boolean> {
    const endpoint = `${this.apiBaseUrl}/models`;
    try {
      const response = await fetch(endpoint);
      return response.ok;
    } catch (error) {
      console.error(`[AI STATUS CHECK FAILED]: Could not connect to ${endpoint}. Is the server running?`, error);
      return false;
    }
  }

  /**
   * Gets embeddings for a given text using the configured embedding model.
   * @param text The text to embed.
   * @returns A promise that resolves with the embedding vector.
   */
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

  // --- Tool Definitions ---
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
  // --- End Tool Definitions ---

  private _extractJson(text: string): any | null {
    // Find the first '{' and the last '}' to extract the JSON part.
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        return null;
    }

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
            suggestedPrompts: Array.isArray(parsedJson.suggestions) ? parsedJson.suggestions.slice(0, 3) : defaultSuggestions
        };
    } else {
        console.error("Failed to parse AI response or find 'response' key:", fullResponseText);
        // Fallback to returning the raw text if parsing fails, but clean it up a bit.
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
      return {
        text: "I'm sorry, but my AI endpoint is not configured correctly in the app's environment file.",
        suggestedPrompts: []
      };
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    // --- Gather comprehensive user context ---
    const userProfile = await firstValueFrom(this.profileService.getProfile());
    const userPreferences = this.preferencesService.getPreferences();
    const scanHistory = this.productDb.getProductsSnapshot();
    const shoppingList = await firstValueFrom(this.shoppingListService.list$);
    const foodDiaryMap = await firstValueFrom(this.foodDiaryService.diary$);
    const badges = await firstValueFrom(this.gamificationService.badges$);

    const recentScansSummary = scanHistory.slice(0, 5).map(p => `${p.name} (${p.brand}, verdict: ${p.verdict})`).join('; ') || 'No recent scans.';
    const shoppingListSummary = shoppingList.map(item => `${item.product_name} (${item.brand}, purchased: ${item.purchased})`).join('; ') || 'Shopping list is empty.';
    
    let dailyDiarySummary = 'No diary entries for today.';
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = foodDiaryMap.get(today);
    if (todayEntries && todayEntries.length > 0) {
      const summary = this.foodDiaryService.getDailySummary(today);
      dailyDiarySummary = `Today's calories: ${summary.totalCalories}, flagged items: ${summary.totalFlaggedItems}. Top flagged: ${Object.keys(summary.flaggedIngredients).slice(0,3).join(', ')}.`;
    }

    const unlockedBadges = badges.filter(b => b.unlocked).map(b => b.name).join(', ') || 'No badges unlocked yet.';

    let lastProductContext = '';
    if (this.lastDiscussedProduct) {
      lastProductContext = `The user recently discussed/scanned: ${this.lastDiscussedProduct.name} by ${this.lastDiscussedProduct.brand}. Ingredients: ${this.lastDiscussedProduct.ingredients.join(', ')}. Verdict: ${this.lastDiscussedProduct.verdict}.`;
    }

    const userContext = `
      User Profile: ${userProfile?.first_name || 'Anonymous'} ${userProfile?.last_name || ''}
      Health Goal: ${userPreferences.goal}
      Avoided Ingredients: ${userPreferences.avoidedIngredients.join(', ')}
      Custom Avoided Ingredients: ${userPreferences.customAvoidedIngredients.join(', ')}
      Max Calories per Serving: ${userPreferences.maxCalories}
      Daily Calorie Target: ${userPreferences.dailyCalorieTarget}
      Recent Scans (last 5): ${recentScansSummary}
      Shopping List: ${shoppingListSummary}
      Today's Food Diary: ${dailyDiarySummary}
      Unlocked Achievements: ${unlockedBadges}
      ${lastProductContext}
    `;
    // --- End Gather comprehensive user context ---
    
    const systemMessage = `You are Fat Boy, an AI nutritional co-pilot.
    **CRITICAL: YOUR ENTIRE RESPONSE MUST BE A SINGLE, VALID JSON OBJECT AND NOTHING ELSE. NO INTRODUCTORY TEXT, NO EXPLANATIONS, NO MARKDOWN.
    The JSON object must have two keys:
    1. "response": (string) Your friendly, user-facing message. This must be natural, conversational, and contain no technical jargon.
    2. "suggestions": (array of 3 strings) Three unique, relevant, and diverse follow-up prompts for the user.

    Example of a PERFECT response:
    {"response": "I've added Organic Berry Granola to your shopping list for you. Is there anything else I can help with?","suggestions": ["Summarize my food diary for today.", "What are some low-calorie snacks?", "Remove the granola from my list."]}

    **INSTRUCTIONS:**
    - Analyze the user's query and the provided context.
    - If the user's intent matches a tool, call the tool.
    - Use the tool's output to formulate your final "response" message.
    - Always provide 3 helpful "suggestions".
    - Failure to provide a valid JSON object as your entire response will result in an error.

    Here is the current user's context:
    ${userContext}
    `;

    // Prepare messages for the API call, including history
    const messagesForApi = [
      { role: 'system', content: systemMessage },
      ...messagesHistory.filter(msg => msg.text && msg.sender).map(msg => ({
        role: msg.sender === 'agent' ? 'assistant' : msg.sender,
        content: msg.text,
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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Chat Completions API Error:', response.status, errorBody);
        return {
          text: `Sorry, I encountered an error (${response.status}) while contacting my brain. Please check the server logs.`,
          suggestedPrompts: []
        };
      }

      const data = await response.json();
      const choice = data.choices[0];

      // --- Handle Tool Calls ---
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        console.log('AI suggested tool calls:', choice.message.tool_calls);
        const toolOutputs: any[] = [];
        let humanReadableSummary = '';

        for (const toolCall of choice.message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          let toolOutput = '';

          let productName = functionArgs.product_name;
          let brand = functionArgs.brand;

          if (!productName && this.lastDiscussedProduct) {
            productName = this.lastDiscussedProduct.name;
          }
          if (!brand && this.lastDiscussedProduct) {
            brand = this.lastDiscussedProduct.brand;
          }

          const productToAdd: Product = {
            id: this.lastDiscussedProduct?.id || Date.now().toString(),
            name: productName || 'Unknown Product',
            brand: brand || 'Unknown Brand',
            ingredients: this.lastDiscussedProduct?.ingredients || [],
            categories: this.lastDiscussedProduct?.categories || [],
            verdict: this.lastDiscussedProduct?.verdict || 'good',
            flaggedIngredients: this.lastDiscussedProduct?.flaggedIngredients || [],
            scanDate: new Date(),
            image: this.lastDiscussedProduct?.image || 'https://via.placeholder.com/150?text=AI+Added'
          };

          switch (functionName) {
            case 'add_to_food_diary':
              if (productToAdd.name && productToAdd.brand && functionArgs.meal_type) {
                await this.foodDiaryService.addEntry(productToAdd, functionArgs.meal_type as MealType);
                toolOutput = `PRODUCT_ADDED: Successfully added "${productToAdd.name}" to food diary for ${functionArgs.meal_type}.`;
                humanReadableSummary = `Adding "${productToAdd.name}" to ${functionArgs.meal_type}.`;
              } else {
                toolOutput = `FAILED: Missing product name, brand, or meal type.`;
              }
              break;
            case 'add_to_shopping_list':
              if (productToAdd.name && productToAdd.brand) {
                const isOnList = this.shoppingListService.isItemOnList(productToAdd.id);
                if (isOnList) {
                  toolOutput = `PRODUCT_EXISTS: The product '${productToAdd.name}' is already on the shopping list. Inform the user of this.`;
                } else {
                  await this.shoppingListService.addItem(productToAdd);
                  toolOutput = `PRODUCT_ADDED: The product '${productToAdd.name}' was successfully added to the shopping list. Confirm this with the user.`;
                }
                humanReadableSummary = `Adding "${productToAdd.name}" to shopping list.`;
              } else {
                toolOutput = `FAILED: Missing product name or brand.`;
              }
              break;
            case 'update_avoided_ingredients':
              const toAdd = functionArgs.add || [];
              const toRemove = functionArgs.remove || [];
              
              toAdd.forEach((ing: string) => this.preferencesService.addCustomAvoidedIngredient(ing));
              toRemove.forEach((ing: string) => this.preferencesService.removeAvoidedIngredient(ing));
              
              let outputParts = [];
              if (toAdd.length > 0) outputParts.push(`Added: ${toAdd.join(', ')}.`);
              if (toRemove.length > 0) outputParts.push(`Removed: ${toRemove.join(', ')}.`);
              toolOutput = `PREFERENCES_UPDATED: ${outputParts.join(' ')}`;
              humanReadableSummary = `Updating your ingredient preferences.`;
              break;
            case 'summarize_food_diary':
              const date = functionArgs.date || new Date().toISOString().split('T')[0];
              const summary = this.foodDiaryService.getDailySummary(date);
              toolOutput = `DIARY_SUMMARY: Date: ${date}, Total Calories: ${summary.totalCalories}, Flagged Items: ${summary.totalFlaggedItems}, Top Flagged: ${Object.keys(summary.flaggedIngredients).slice(0,3).join(', ')}.`;
              humanReadableSummary = `Summarizing your food diary for ${date}.`;
              break;
            default:
              toolOutput = `Unknown tool: ${functionName}`;
              console.warn(toolOutput);
          }
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: toolOutput
          });
        }

        const toolResponseMessages = [
          ...messagesForApi,
          choice.message,
          ...toolOutputs.map(output => ({
            role: "tool",
            tool_call_id: output.tool_call_id,
            content: output.output
          }))
        ];

        const toolResponsePayload = {
          model: this.chatModelName,
          messages: toolResponseMessages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: false
        };

        const toolResponse = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(toolResponsePayload)
        });

        if (!toolResponse.ok) {
          const errorBody = await toolResponse.text();
          console.error('Tool Response API Error:', toolResponse.status, errorBody);
          return {
            text: `Sorry, I encountered an error processing the tool call.`,
            suggestedPrompts: []
          };
        }

        const toolData = await toolResponse.json();
        const toolResponseMessage = toolData.choices[0].message.content;
        
        const parsedToolResponse = this._parseAiResponse(toolResponseMessage);
        return { ...parsedToolResponse, toolCalls: choice.message.tool_calls, humanReadableToolCall: humanReadableSummary };
      }
      // --- End Handle Tool Calls ---

      return this._parseAiResponse(choice.message.content);

    } catch (error) {
      console.error('Network or other error calling Chat Completions API:', error);
      return {
        text: "Sorry, I couldn't connect to the AI service. Please ensure the model server is running and accessible from your browser.",
        suggestedPrompts: []
      };
    }
  }

  // Method to set the last discussed product (e.g., after a scan or OCR result)
  setLastDiscussedProduct(product: Product | null): void {
    this.lastDiscussedProduct = product;
  }

  getLastDiscussedProduct(): Product | null {
    return this.lastDiscussedProduct;
  }
}