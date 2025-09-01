import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ProductDbService } from './product-db.service';

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  private apiBaseUrl = environment.openaiApiBaseUrl;
  private apiKey = environment.openaiApiKey;
  private modelName = environment.visionModelName;

  constructor(private productDb: ProductDbService) { }

  /**
   * Checks if the AI model endpoint is reachable.
   * @returns A promise that resolves with true if the endpoint is online, false otherwise.
   */
  async checkAgentStatus(): Promise<boolean> {
    const endpoint = `${this.apiBaseUrl}/models`;
    try {
      const response = await fetch(endpoint);
      return response.ok;
    } catch (error) {
      console.error('Error checking agent status:', error);
      return false;
    }
  }

  /**
   * Sends a prompt directly to the chat completions endpoint from the browser.
   * @param userInput The raw text from the user.
   * @returns A promise that resolves with the model's text response.
   */
  async getChatCompletion(userInput: string): Promise<string> {
    const endpoint = `${this.apiBaseUrl}/chat/completions`;
    if (!endpoint || !this.modelName) {
      return "I'm sorry, but my AI endpoint is not configured correctly.";
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const history = this.productDb.getProductsSnapshot();
    const summary = `The user has scanned ${history.length} products. ${history.filter(p => p.verdict === 'good').length} were approved.`;
    const systemMessage = `You are Fat Boy, an AI nutritional co-pilot powered by NIRVANA from Fanalogy. Your responses must be concise (1-2 sentences). Current user scan summary: ${summary}.`;

    const payload = {
      model: this.modelName,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userInput }
      ],
      temperature: 0.7,
      max_tokens: 150,
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
        return `Sorry, I encountered an error (${response.status}) while contacting my brain. Please check the console.`;
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Network or other error calling Chat Completions API:', error);
      return "Sorry, I couldn't connect to the AI service. Please ensure the model server is running and accessible.";
    }
  }
}