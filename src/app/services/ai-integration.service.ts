import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ProductDbService } from './product-db.service';
import { ProfileService } from './profile.service';
import { PreferencesService } from './preferences.service';
import { ShoppingListService } from './shopping-list.service';
import { FoodDiaryService } from './food-diary.service';
import { GamificationService } from './gamification.service';
import { firstValueFrom } from 'rxjs';

export interface AiResponse {
  text: string;
  followUpQuestions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  private apiBaseUrl = environment.openaiApiBaseUrl;
  private apiKey = environment.openaiApiKey;
  private chatModelName = environment.visionModelName;
  private embeddingModelName = environment.embeddingModelName;

  constructor(
    private productDb: ProductDbService,
    private profileService: ProfileService,
    private preferencesService: PreferencesService,
    private shoppingListService: ShoppingListService,
    private foodDiaryService: FoodDiaryService,
    private gamificationService: GamificationService
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

  async getChatCompletion(userInput: string): Promise<AiResponse> {
    const endpoint = `${this.apiBaseUrl}/chat/completions`;
    if (!endpoint || !this.chatModelName) {
      return {
        text: "I'm sorry, but my AI endpoint is not configured correctly in the app's environment file.",
        followUpQuestions: []
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
    const shoppingListSummary = shoppingList.map(item => `${item.name} (${item.brand}, purchased: ${item.purchased})`).join('; ') || 'Shopping list is empty.';
    
    let dailyDiarySummary = 'No diary entries for today.';
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = foodDiaryMap.get(today);
    if (todayEntries && todayEntries.length > 0) {
      const summary = this.foodDiaryService.getDailySummary(today);
      dailyDiarySummary = `Today's calories: ${summary.totalCalories}, flagged items: ${summary.totalFlaggedItems}. Top flagged: ${Object.keys(summary.flaggedIngredients).slice(0,3).join(', ')}.`;
    }

    const unlockedBadges = badges.filter(b => b.unlocked).map(b => b.name).join(', ') || 'No badges unlocked yet.';

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
    `;
    // --- End Gather comprehensive user context ---
    
    // --- RAG Integration (Phase 1: Get embedding for user input) ---
    let userQueryEmbedding: number[] = [];
    if (this.embeddingModelName) {
      try {
        userQueryEmbedding = await this.getEmbeddings(userInput);
        console.log('User query embedding generated:', userQueryEmbedding.slice(0, 5), '...'); // Log first 5 dimensions
      } catch (embedError) {
        console.error('Error generating user query embedding:', embedError);
      }
    }
    // --- End RAG Integration Phase 1 ---

    // Updated system message to instruct for follow-up questions
    const systemMessage = `You are Fat Boy, an AI nutritional co-pilot powered by NIRVANA from Fanalogy. Your responses must be concise (1-2 sentences). If the user asks about a food item, provide its benefits and key characteristics/ingredients. Always conclude your response by generating exactly 3 relevant follow-up questions in a JSON array format, prefixed with '[FOLLOW_UP_QUESTIONS]'. Example: "Main response text. [FOLLOW_UP_QUESTIONS] [\"Question 1?\", \"Question 2?\", \"Question 3?\"]".
    
    Here is the current user's context:
    ${userContext}
    `;

    const payload = {
      model: this.chatModelName,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userInput }
      ],
      temperature: 0.7,
      max_tokens: 300,
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
          followUpQuestions: []
        };
      }

      const data = await response.json();
      let fullResponseText = data.choices[0].message.content;
      let mainText = fullResponseText;
      let followUpQuestions: string[] = [];

      const marker = '[FOLLOW_UP_QUESTIONS]';
      const markerIndex = fullResponseText.indexOf(marker);

      if (markerIndex !== -1) {
        mainText = fullResponseText.substring(0, markerIndex).trim();
        const jsonString = fullResponseText.substring(markerIndex + marker.length).trim();
        try {
          const parsedQuestions = JSON.parse(jsonString);
          if (Array.isArray(parsedQuestions) && parsedQuestions.every(q => typeof q === 'string')) {
            followUpQuestions = parsedQuestions.slice(0, 3);
          }
        } catch (jsonError) {
          console.warn('Failed to parse follow-up questions JSON:', jsonError);
          mainText = fullResponseText;
          followUpQuestions = [];
        }
      }

      return { text: mainText, followUpQuestions };

    } catch (error) {
      console.error('Network or other error calling Chat Completions API:', error);
      return {
        text: "Sorry, I couldn't connect to the AI service. Please ensure the model server is running and accessible from your browser.",
        followUpQuestions: []
      };
    }
  }
}