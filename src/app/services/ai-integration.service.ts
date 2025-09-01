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
   * Sends a prompt to the chat completions endpoint and streams the response.
   * @param userInput The raw text from the user.
   * @param onChunk A callback function that will be called with each new chunk of text from the model.
   */
  async getChatCompletionStream(userInput: string, onChunk: (chunk: string) => void): Promise<void> {
    const endpoint = `${this.apiBaseUrl}/chat/completions`;
    if (!endpoint || !this.modelName) {
      throw new Error("AI endpoint or model not configured.");
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
      max_tokens: 300,
      stream: true // Enable streaming
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok || !response.body) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        
        // Process server-sent events
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
        for (const line of lines) {
          const jsonStr = line.replace('data: ', '');
          if (jsonStr === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Ignore parsing errors for incomplete JSON chunks
          }
        }
      }
    } catch (error) {
      console.error('Streaming API Error:', error);
      onChunk("\n\nSorry, I encountered an error while streaming my response.");
    }
  }
}