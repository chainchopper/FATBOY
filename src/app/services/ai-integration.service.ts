import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from './product-db.service';
import { ProductDbService } from './product-db.service';

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  private openaiApiBaseUrl = environment.openaiApiBaseUrl;
  private openaiApiKey = environment.openaiApiKey;
  private modelName = environment.visionModelName; // Using this for chat model as well

  constructor(private http: HttpClient, private productDb: ProductDbService) { }

  /**
   * Sends a prompt to the chat completions endpoint and gets a response.
   * @param userInput The raw text from the user.
   * @returns A promise that resolves with the model's text response.
   */
  async getChatCompletion(userInput: string): Promise<string> {
    const endpoint = `${this.openaiApiBaseUrl}/chat/completions`;
    if (!endpoint || !this.modelName) {
      console.warn('Chat model endpoint or name not configured.');
      return "Chat model not configured.";
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(this.openaiApiKey && { 'Authorization': `Bearer ${this.openaiApiKey}` })
    });

    // Build the context and system message
    const history = this.productDb.getProductsSnapshot();
    const summary = `The user has scanned ${history.length} products. ${history.filter(p => p.verdict === 'good').length} were approved.`;
    const systemMessage = `You are Fat Boy, an AI nutritional co-pilot. Your responses must be concise (1-2 sentences). Current user scan summary: ${summary}.`;

    const payload = {
      model: this.modelName,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userInput }
      ],
      temperature: 0.7,
      max_tokens: 300, // Limit resource usage
      stream: false // We are not using streaming for now
    };

    try {
      const response = await lastValueFrom(this.http.post<any>(endpoint, payload, { headers }));
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Chat Completions API Error:', error);
      return "Sorry, I encountered an error while trying to respond.";
    }
  }
}