import { Injectable } from '@angular/core';

export interface IngredientAnalysis {
  categories: string[];
  flagged: boolean;
  reason?: string;
}

export interface ProductEvaluation {
  verdict: 'good' | 'bad';
  flaggedIngredients: { ingredient: string, reason: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class IngredientParserService {

  private readonly AVOID_LISTS: { [key: string]: string[] } = {
    avoidArtificialSweeteners: ['aspartame', 'sucralose', 'saccharin', 'acesulfame potassium', 'neotame', 'advantame'],
    avoidArtificialColors: ['red 40', 'yellow 5', 'yellow 6', 'blue 1', 'blue 2', 'green 3', 'fd&c'],
    avoidHFCS: ['high-fructose corn syrup', 'hfcs'],
    avoidPreservatives: ['bht', 'bha', 'sodium benzoate', 'potassium sorbate', 'sodium nitrate', 'sodium nitrite', 'sulfites', 'tbhq'],
    avoidMSG: ['monosodium glutamate', 'msg'],
    avoidTransFats: ['partially hydrogenated', 'hydrogenated oil']
  };

  evaluateProduct(ingredients: string[], calories: number | undefined, preferences: any): ProductEvaluation {
    const flagged: { ingredient: string, reason: string }[] = [];

    // 1. Check ingredients against preference lists
    for (const key in this.AVOID_LISTS) {
      if (preferences[key]) {
        this.AVOID_LISTS[key].forEach(avoidItem => {
          ingredients.forEach(ingredient => {
            if (ingredient.toLowerCase().includes(avoidItem)) {
              if (!flagged.some(f => f.ingredient === ingredient)) {
                flagged.push({ ingredient, reason: this.getReasonForKey(key) });
              }
            }
          });
        });
      }
    }

    // 2. Check calorie limit
    if (preferences.maxCalories && calories && calories > preferences.maxCalories) {
      flagged.push({ ingredient: `Calories (${calories})`, reason: `Exceeds your limit of ${preferences.maxCalories}` });
    }

    return {
      verdict: flagged.length === 0 ? 'good' : 'bad',
      flaggedIngredients: flagged
    };
  }

  private getReasonForKey(key: string): string {
    const reasons: { [key: string]: string } = {
      avoidArtificialSweeteners: 'Artificial Sweetener',
      avoidArtificialColors: 'Artificial Color',
      avoidHFCS: 'High-Fructose Corn Syrup',
      avoidPreservatives: 'Preservative',
      avoidMSG: 'MSG',
      avoidTransFats: 'Trans Fat'
    };
    return reasons[key] || 'Flagged Ingredient';
  }

  categorizeProduct(ingredients: string[]): string[] {
    const categories = new Set<string>();
    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      for (const key in this.AVOID_LISTS) {
        this.AVOID_LISTS[key].forEach(avoidItem => {
          if (lowerIngredient.includes(avoidItem)) {
            categories.add(this.getCategoryNameForKey(key));
          }
        });
      }
    });
    if (categories.size === 0) {
      categories.add('natural');
    }
    return Array.from(categories);
  }

  private getCategoryNameForKey(key: string): string {
    const names: { [key: string]: string } = {
      avoidArtificialSweeteners: 'artificialSweeteners',
      avoidArtificialColors: 'artificialColors',
      avoidHFCS: 'hfcs',
      avoidPreservatives: 'preservatives',
      avoidMSG: 'msg',
      avoidTransFats: 'transFats'
    };
    return names[key] || 'other';
  }
  
  // This is a simplified version for broad checks, the main logic is now in evaluateProduct
  evaluateIngredients(ingredients: string[], preferences: any): string[] {
    const evaluation = this.evaluateProduct(ingredients, undefined, preferences);
    return evaluation.flaggedIngredients.map(f => f.ingredient);
  }
}