import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiIntegrationService } from '../services/ai-integration.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { take } from 'rxjs';

interface Suggestion {
  product: Product;
  similarity: number; // e.g., 95 for 95% match
  reason: string; // e.g., "Because you like natural snacks with low sugar."
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
  isLoading = true;

  constructor(
    private aiService: AiIntegrationService,
    private productDb: ProductDbService,
    private shoppingListService: ShoppingListService
  ) {}

  ngOnInit() {
    this.fetchSuggestions();
  }

  fetchSuggestions() {
    this.isLoading = true;
    this.productDb.products$.pipe(take(1)).subscribe(async (history) => {
      if (history.length === 0) {
        this.suggestions = [];
        this.isLoading = false;
        return;
      }

      // In a real app, this would make an API call:
      // const aiSuggestions = await this.aiService.getSuggestions(history);
      
      // For now, we'll mock the AI response to build the UI
      this.suggestions = this.mockAiSuggestions(history);
      
      this.isLoading = false;
    });
  }

  private mockAiSuggestions(history: Product[]): Suggestion[] {
    const goodProducts = history.filter(p => p.verdict === 'good').slice(0, 1);
    
    const baseSuggestions: Suggestion[] = [
      {
        product: {
          id: 'ai-prod-2',
          name: 'Organic Berry Granola',
          brand: 'Nature\'s Best',
          ingredients: ['Organic Oats', 'Dried Berries', 'Maple Syrup'],
          verdict: 'good',
          flaggedIngredients: [],
          scanDate: new Date(),
          categories: ['natural'],
          image: 'https://images.unsplash.com/photo-1504754524776-8f4f3779077d?q=80&w=2070&auto=format&fit=crop'
        },
        similarity: 92,
        reason: "A great alternative to products you've scanned."
      },
      {
        product: {
          id: 'ai-prod-3',
          name: 'Lime Sparkling Water',
          brand: 'Aqua Fizz',
          ingredients: ['Carbonated Water', 'Natural Lime Flavor'],
          verdict: 'good',
          flaggedIngredients: [],
          scanDate: new Date(),
          categories: ['natural'],
          image: 'https://images.unsplash.com/photo-1610313393293-e08e481348e9?q=80&w=1931&auto=format&fit=crop'
        },
        similarity: 88,
        reason: "Matches your goal of avoiding artificial sweeteners."
      }
    ];

    if (goodProducts.length > 0) {
      baseSuggestions.unshift({
        product: { ...goodProducts[0], name: "Alternative to " + goodProducts[0].name },
        similarity: 95,
        reason: "Based on your preference for natural ingredients."
      });
    }
    
    return baseSuggestions;
  }

  saveSuggestion(product: Product) {
    this.shoppingListService.addItem(product);
  }

  getCategoryIcon(category: string): string {
    const icons: {[key: string]: string} = {
      artificialSweeteners: '🧪',
      artificialColors: '🎨',
      preservatives: '🧴',
      hfcs: '🌽',
      msg: '🍜',
      transFats: '🍔',
      natural: '🌿',
      allergens: '⚠️'
    };
    
    return icons[category] || '📋';
  }
}