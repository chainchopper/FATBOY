import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiIntegrationService } from '../services/ai-integration.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { ShoppingListService, ShoppingListItem } from '../services/shopping-list.service';
import { PreferencesService } from '../services/preferences.service';
import { combineLatest, take } from 'rxjs';

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
    private preferencesService: PreferencesService
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

  fetchSuggestions() {
    this.productDb.products$.pipe(take(1)).subscribe(async (history) => {
      if (history.length === 0) {
        this.suggestions = [];
        this.isLoading = false;
        return;
      }
      this.suggestions = this.mockAiSuggestions(history);
      this.isLoading = false;
    });
  }

  private mockAiSuggestions(history: Product[]): Suggestion[] {
    const goodProducts = history.filter(p => p.verdict === 'good').slice(0, 1);
    const baseSuggestions: Suggestion[] = [
      {
        product: {
          id: 'ai-prod-2', name: 'Organic Berry Granola', brand: 'Nature\'s Best',
          ingredients: ['Organic Oats', 'Dried Berries', 'Maple Syrup'], verdict: 'good',
          flaggedIngredients: [], scanDate: new Date(), categories: ['natural'],
          image: 'https://images.unsplash.com/photo-1504754524776-8f4f3779077d?q=80&w=2070&auto=format&fit=crop'
        },
        similarity: 92, reason: "A great alternative to products you've scanned."
      },
      {
        product: {
          id: 'ai-prod-3', name: 'Lime Sparkling Water', brand: 'Aqua Fizz',
          ingredients: ['Carbonated Water', 'Natural Lime Flavor'], verdict: 'good',
          flaggedIngredients: [], scanDate: new Date(), categories: ['natural'],
          image: 'https://images.unsplash.com/photo-1610313393293-e08e481348e9?q=80&w=1931&auto=format&fit=crop'
        },
        similarity: 88, reason: "Matches your goal of avoiding artificial sweeteners."
      }
    ];
    if (goodProducts.length > 0) {
      baseSuggestions.unshift({
        product: { ...goodProducts[0], name: "Alternative to " + goodProducts[0].name },
        similarity: 95, reason: "Based on your preference for natural ingredients."
      });
    }
    return baseSuggestions;
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
    // Remove the resolved conflict from the local array to update the UI
    this.conflicts = this.conflicts.filter(c => c !== conflict);
  }

  getCategoryIcon(category: string): string {
    const icons: {[key: string]: string} = {
      natural: '🌿',
    };
    return icons[category] || '📋';
  }
}