import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { ProductDbService } from './product-db.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  private modelName = environment.visionModelName;

  constructor(private productDb: ProductDbService) { }

  async checkAgentStatus(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('agent-status');
      if (error) throw error;
      return data.status === 'ok';
    } catch (error) {
      console.error('Error checking agent status:', error);
      return false;
    }
  }

  async getChatCompletion(userInput: string): Promise<string> {
    try {
      const history = this.productDb.getProductsSnapshot();
      const summary = `The user has scanned ${history.length} products. ${history.filter(p => p.verdict === 'good').length} were approved.`;
      const systemMessage = `You are Fat Boy, an AI nutritional co-pilot powered by NIRVANA from Fanalogy. Your responses must be concise (1-2 sentences). Current user scan summary: ${summary}.`;

      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userInput }
      ];

      const { data, error } = await supabase.functions.invoke('agent-chat', {
        body: {
          model: this.modelName,
          messages: messages,
          temperature: 0.7,
          max_tokens: 150
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error.message);

      return data.choices[0].message.content;

    } catch (error) {
      console.error('Error getting chat completion:', error);
      return "Sorry, I encountered an error while trying to respond. Please check the console for details.";
    }
  }
}