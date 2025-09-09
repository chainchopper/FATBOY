import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiIntegrationService } from '../services/ai-integration.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { ShoppingListService, ShoppingListItem } from '../services/shopping-list.service';
import { PreferencesService } from '../services/preferences.service';
import { combineLatest, take } from 'rxjs';
import { supabase } from '../../integrations/supabase/client';
import { NotificationService } from '../services/notification.service';

interface Suggestion {
  product: Product;
  similarity: number; // This will be a mock value for now
  reason: string;
}

interface Conflict {
  product: Product;
  conflictingIngredient: string;
  listType: 'Shopping List' | 'Saved Products';
}

@Component({
  selector: 'app-suggestions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './suggestions.component.html',
  styleUrls: ['./suggestions.component.css']
})
export class SuggestionsComponent implements OnInit {
  suggestions: Suggestion[] = [];
  conflicts: Conflict[] = [];
  isLoading = true;

  constructor(
    private aiService: AiIntegrationService,
    private productDb: ProductDbService,
    private shoppingListService: ShoppingListService,
    private preferencesService: PreferencesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.checkForConflicts();
    this.fetchSuggestions();
  }

  checkForConflicts() {
    const preferences = this.preferencesService.getPreferences();
    const avoidList = [...preferences.avoidedIngredients, ...preferences.customAvoidedIngredients];
    if (avoidList.length === 0) return;

    combineLatest([
      this.productDb.products$,
      this.shoppingListService.list$
    ]).pipe(take(1)).subscribe(([savedProducts, shoppingListItems]) => {
      const newConflicts: Conflict[] = [];

      // Check saved products
      savedProducts.forEach(product => {
        const conflict = avoidList.find(avoided => 
          product.ingredients.some(ing => ing.toLowerCase().includes(avoided.toLowerCase()))
        );
        if (conflict) {
          newConflicts.push({ product, conflictingIngredient: conflict, listType: 'Saved Products' });
        }
      });

      // Check shopping list items
      shoppingListItems.forEach(item => {
        if (item.product) {
          const conflict = avoidList.find(avoided => 
            item.product!.ingredients.some(ing => ing.toLowerCase().includes(avoided.toLowerCase()))
          );
          if (conflict) {
            newConflicts.push({ product: item.product, conflictingIngredient: conflict, listType: 'Shopping List' });
          }
        }
      });

      this.conflicts = newConflicts;
    });
  }

  async fetchSuggestions() {
    this.isLoading = true;
    try {
      const prompt = `Based on my user context, suggest 3 products I might like. Respond with ONLY a valid JSON array of objects. Each object must have three keys: 'name' (string), 'brand' (string), and 'reason' (string).`;
      const aiResponse = await this.aiService.getChatCompletion(prompt);
      
      const parsedSuggestions = JSON.parse(aiResponse.text);
      if (!Array.isArray(parsedSuggestions)) {
        throw new Error("AI response is not an array.");
      }

      const foodNames = parsedSuggestions.map(s => `${s.name} ${s.brand}`);
      const { data: productsData, error: functionError } = await supabase.functions.invoke('fetch-food-metadata', {
        body: { food_names: foodNames }
      });

      if (functionError) throw functionError;

      this.suggestions = parsedSuggestions.map((suggestion: any, index: number) => {
        const productInfo = productsData[index]?.product;
        return {
          product: productInfo || {
            id: `ai-gen-${index}`,
            name: suggestion.name,
            brand: suggestion.brand,
            ingredients: [],
            verdict: 'good',
            flaggedIngredients: [],
            scanDate: new Date(),
            categories: ['suggestion'],
            image: 'https://via.placeholder.com/150?text=Suggestion'
          },
          similarity: Math.floor(Math.random() * (95 - 85 + 1) + 85), // Mock similarity
          reason: suggestion.reason
        };
      });

    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      this.notificationService.showError('Could not fetch AI suggestions at this time.');
      this.suggestions = [];
    } finally {
      this.isLoading = false;
    }
  }

  saveSuggestion(product: Product) {
    this.shoppingListService.addItem(product);
  }

  resolveConflict(conflict: Conflict) {
    if (conflict.listType === 'Saved Products') {
      this.productDb.removeProduct(conflict.product.id);
    } else {
      const shoppingListItem = this.shoppingListService.getListSnapshot().find(item => item.product_id === conflict.product.id);
      if (shoppingListItem) {
        this.shoppingListService.removeItem(shoppingListItem.id);
      }
    }
    this.conflicts = this.conflicts.filter(c => c !== conflict);
    this.notificationService.showSuccess(`${conflict.product.name} removed from your ${conflict.listType}.`);
  }

  getCategoryIcon(category: string): string {
    const icons: {[key: string]: string} = {
      natural: '🌿',
      pre_populated: '📚',
      suggestion: '💡'
    };
    return icons[category] || '📋';
  }
}