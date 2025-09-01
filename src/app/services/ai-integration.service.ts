import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { ProductDbService } from './product-db.service';

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  constructor(private productDb: ProductDbService) { }

  /**
   * Sends a prompt to our secure backend, which then calls the chat completions endpoint.
   * @param userInput The raw text from the user.
   * @returns A promise that resolves with the model's text response.
   */
  async getChatCompletion(userInput: string): Promise<string> {
    try {
      // 1. Build the context for the system message
      const history = this.productDb.getProductsSnapshot();
      const summary = `The user has scanned ${history.length} products. ${history.filter(p => p.verdict === 'good').length} were approved.`;
      const systemMessage = `You are Fat Boy, an AI nutritional co-pilot powered by NIRVANA from Fanalogy. Your responses must be concise (1-2 sentences). Current user scan summary: ${summary}.`;

      // 2. Create the messages array to send to our backend
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userInput }
      ];

      // 3. Invoke the secure Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('agent', {
        body: { messages },
      });

      if (error) {
        console.error('Error invoking Supabase function:', error);
        return "Sorry, I couldn't connect to the AI service.";
      }

      if (data.error) {
        console.error('Error from AI service backend:', data.error);
        return "Sorry, the AI service returned an error. Please check the backend logs.";
      }

      // 4. Return the AI's response
      return data.choices[0].message.content;

    } catch (error) {
      console.error('Network or other error calling AI service:', error);
      return "Sorry, I encountered an error. Please check the console for details.";
    }
  }
}