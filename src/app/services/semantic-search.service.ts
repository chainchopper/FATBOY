import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { environment } from '../../environments/environment';
import { Product, ProductDbService } from './product-db.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class SemanticSearchService {
  private embeddingModel = environment.embeddingModelName;
  private aiApiBaseUrl = environment.openaiApiBaseUrl;

  constructor(
    private productDbService: ProductDbService,
    private notificationService: NotificationService
  ) {}

  async search(query: string): Promise<Product[]> {
    if (!query.trim()) {
      return this.productDbService.getProductsSnapshot(); // Return all products if query is empty
    }

    try {
      // 1. Generate embedding for the user's query
      const embeddingResponse = await fetch(`${this.aiApiBaseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: query,
        }),
      });

      if (!embeddingResponse.ok) {
        throw new Error('Failed to generate query embedding.');
      }

      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.data[0].embedding;

      // 2. Call the Supabase RPC function to find matching products
      const { data: searchResults, error: rpcError } = await supabase.rpc('fatboy_semantic_product_search', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7, // Adjust as needed
        match_count: 10,
      });

      if (rpcError) {
        throw rpcError;
      }

      if (!searchResults || searchResults.length === 0) {
        return [];
      }

      // 3. Map the search results back to full Product objects
      const productIds = searchResults.map((item: { id: string }) => item.id);
      const allProducts = this.productDbService.getProductsSnapshot();
      
      // We need to match the database ID from embeddings with the client-side ID in product_data
      const matchingProducts = allProducts.filter(p => {
        // This is a temporary workaround. A better solution would be to store the DB id on the client product object.
        // For now, we'll rely on the content matching.
        const searchResult = searchResults.find((sr: { content: string }) => sr.content.includes(p.name));
        return !!searchResult;
      });

      // A more robust way if we had the DB ID on the client object
      // const matchingProducts = allProducts.filter(p => productIds.includes(p.databaseId));

      return matchingProducts;

    } catch (error) {
      console.error('Error during semantic search:', error);
      this.notificationService.showError('AI search failed. Please try again.');
      return [];
    }
  }
}