import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiIntegrationService } from '../services/ai-integration.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { ShoppingListService, ShoppingListItem } from '../services/shopping-list.service';
import { PreferencesService, UserPreferences } from '../services/preferences.service';
import { combineLatest, take } from 'rxjs';
import { supabase } from '../../integrations/supabase/client';
import { NotificationService } from '../services/notification.service';
import { SpeechService } from '../services/speech.service';
import { AuthService } from '../services/auth.service';

interface Suggestion {
  product: Product;
  similarity: number;
  reason: string;
}

interface Conflict {
  product: Product;
  conflictingIngredient: string;
  listType: 'Shopping List' | 'Saved Products';
}

interface SuggestionsCache {
  suggestions: Suggestion[];
  preferencesHash: string;
  timestamp: number;
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
  private currentUserId: string | null = null;

  constructor(
    private aiService: AiIntegrationService,
    private productDb: ProductDbService,
    private shoppingListService: ShoppingListService,
    private preferencesService: PreferencesService,
    private notificationService: NotificationService,
    private speechService: SpeechService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadSuggestions();
      this.checkForConflicts();
    });
  }

  private async loadSuggestions() {
    this.isLoading = true;
    const cacheKey = `suggestionsCache_${this.currentUserId}`;
    const cachedData = localStorage.getItem(cacheKey);
    const currentPrefs = this.preferencesService.getPreferences();
    const currentPrefsHash = JSON.stringify(currentPrefs);
    const oneDay = 24 * 60 * 60 * 1000;

    if (cachedData) {
      const cache: SuggestionsCache = JSON.parse(cachedData);
      if (cache.preferencesHash === currentPrefsHash && (Date.now() - cache.timestamp < oneDay)) {
        this.suggestions = cache.suggestions;
        this.isLoading = false;
        this.speakSuggestions();
        return;
      }
    }

    await this.fetchSuggestionsFromAI();
  }

  private async fetchSuggestionsFromAI() {
    try {
      const scanHistory = this.productDb.getProductsSnapshot();
      const approvedProducts = scanHistory.filter(p => p.verdict === 'good').slice(0, 5); // Use up to 5 approved products

      if (approvedProducts.length === 0) {
        this.suggestions = [];
        this.isLoading = false;
        return;
      }

      const productExamples = approvedProducts.map(p => `- ${p.name} by ${p.brand}`).join('\n');
      const prompt = `The user likes the following products:\n${productExamples}\n\nBased on these, suggest 3 similar products they might also enjoy. Respond with ONLY a valid JSON array of objects. Each object must have three keys: 'name' (string), 'brand' (string), and 'reason' (string, explaining why it's a good match).`;
      
      const aiResponse = await this.aiService.getChatCompletion(prompt);
      
      // The AI service now returns a structured object, so we access the 'text' property
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
          similarity: 0, // Removed random similarity
          reason: suggestion.reason
        };
      });

      // Save to cache
      const cacheKey = `suggestionsCache_${this.currentUserId}`;
      const newCache: SuggestionsCache = {
        suggestions: this.suggestions,
        preferencesHash: JSON.stringify(this.preferencesService.getPreferences()),
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(newCache));
      this.speakSuggestions();

    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      this.notificationService.showError('Could not fetch AI suggestions at this time.');
      this.suggestions = [];
    } finally {
      this.isLoading = false;
    }
  }

  private speakSuggestions() {
    if (this.suggestions.length > 0) {
      const summary = `Here are a few suggestions for you: ${this.suggestions.map(s => s.product.name).join(', ')}.`;
      this.speechService.speak(summary);
    }
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