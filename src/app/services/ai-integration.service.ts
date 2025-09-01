import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ProductDbService } from './product-db.service';

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
  private modelName = environment.visionModelName;

  constructor(private productDb: ProductDbService) { }

  /**
   * Checks if the AI model endpoint is reachable by fetching the models list.
   * @returns A promise that resolves with true if the endpoint is online, false otherwise.
   */
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
   * Sends a prompt directly to the chat completions endpoint from the browser.
   * @param userInput The raw text from the user.
   * @returns A promise that resolves with the model's text response and follow-up questions.
   */
  async getChatCompletion(userInput: string): Promise<AiResponse> {
    const endpoint = `${this.apiBaseUrl}/chat/completions`;
    if (!endpoint || !this.modelName) {
      return {
        text: "I'm sorry, but my AI endpoint is not configured correctly in the app's environment file.",
        followUpQuestions: []
      };
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const history = this.productDb.getProductsSnapshot();
    const summary = `The user has scanned ${history.length} products. ${history.filter(p => p.verdict === 'good').length} were approved.`;
    
    // Updated system message to instruct for follow-up questions
    const systemMessage = `You are Fat Boy, an AI nutritional co-pilot powered by NIRVANA from Fanalogy. Your responses must be concise (1-2 sentences). If the user asks about a food item, provide its benefits and key characteristics/ingredients. Always conclude your response by generating exactly 3 relevant follow-up questions in a JSON array format, prefixed with '[FOLLOW_UP_QUESTIONS]'. Example: "Main response text. [FOLLOW_UP_QUESTIONS] [\"Question 1?\", \"Question 2?\", \"Question 3?\"]". Current user scan summary: ${summary}.`;

    const payload = {
      model: this.modelName,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userInput }
      ],
      temperature: 0.7,
      max_tokens: 300, // Increased token limit to accommodate questions
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
            followUpQuestions = parsedQuestions.slice(0, 3); // Ensure max 3 questions
          }
        } catch (jsonError) {
          console.warn('Failed to parse follow-up questions JSON:', jsonError);
          // Fallback: if JSON parsing fails, treat the whole thing as text
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