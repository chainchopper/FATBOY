import { Injectable } from '@angular/core';
import { PreferencesService, UserPreferences } from './preferences.service'; // Import PreferencesService and UserPreferences

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

  public readonly INGREDIENT_DATABASE: { [key: string]: { name: string, items: string[] } } = {
    artificialSweeteners: {
      name: 'Artificial Sweeteners',
      items: ['aspartame', 'sucralose', 'saccharin', 'acesulfame potassium', 'neotame', 'advantame']
    },
    artificialColors: {
      name: 'Artificial Colors',
      items: ['red 40', 'yellow 5', 'yellow 6', 'blue 1', 'blue 2', 'green 3', 'fd&c']
    },
    fatsAndOils: {
      name: 'Fats & Oils',
      items: ['partially hydrogenated', 'hydrogenated oil', 'palm oil', 'shortening']
    },
    preservatives: {
      name: 'Preservatives',
      items: ['bht', 'bha', 'sodium benzoate', 'potassium sorbate', 'sodium nitrate', 'sodium nitrite', 'sulfites', 'tbhq']
    },
    syrupsAndSugars: {
      name: 'Syrups & Sugars',
      items: ['high-fructose corn syrup', 'hfcs', 'corn syrup', 'glucose', 'dextrose']
    },
    additives: {
      name: 'Additives & Flavor Enhancers',
      items: ['monosodium glutamate', 'msg', 'yeast extract', 'disodium guanylate']
    },
    allergens: {
      name: 'Common Allergens',
      items: ['gluten', 'wheat', 'soy', 'dairy', 'lactose', 'casein', 'whey']
    }
  };

  constructor(private preferencesService: PreferencesService) {} // Inject PreferencesService

  evaluateProduct(ingredients: string[], calories: number | undefined, preferences: UserPreferences): ProductEvaluation {
    const flagged: { ingredient: string, reason: string }[] = [];
    
    // Combine both predefined and custom avoided ingredients into one master list
    const predefinedAvoidList = preferences.avoidedIngredients || [];
    const customAvoidList = preferences.customAvoidedIngredients || [];
    const fullAvoidList = [...predefinedAvoidList, ...customAvoidList];

    // 1. Check ingredients against the user's full avoid list
    fullAvoidList.forEach((avoidItem: string) => {
      if (!avoidItem) return; // Skip empty strings
      const lowerAvoidItem = avoidItem.toLowerCase();
      ingredients.forEach(ingredient => {
        if (ingredient.toLowerCase().includes(lowerAvoidItem)) {
          if (!flagged.some(f => f.ingredient === ingredient)) {
            flagged.push({ ingredient, reason: `Contains ${avoidItem}, which you avoid.` });
          }
        }
      });
    });

    // 2. Check calorie limit
    if (preferences.maxCalories && calories && calories > preferences.maxCalories) {
      flagged.push({ ingredient: `Calories (${calories})`, reason: `Exceeds your limit of ${preferences.maxCalories}` });
    }

    return {
      verdict: flagged.length === 0 ? 'good' : 'bad',
      flaggedIngredients: flagged
    };
  }

  categorizeProduct(ingredients: string[]): string[] {
    const categories = new Set<string>();
    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      for (const key in this.INGREDIENT_DATABASE) {
        this.INGREDIENT_DATABASE[key].items.forEach(avoidItem => {
          if (lowerIngredient.includes(avoidItem)) {
            categories.add(key);
          }
        });
      }
    });
    if (categories.size === 0) {
      categories.add('natural');
    }
    return Array.from(categories);
  }
  
  evaluateIngredients(ingredients: string[]): string[] {
    const preferences = this.preferencesService.getPreferences(); // Get preferences from service
    const evaluation = this.evaluateProduct(ingredients, undefined, preferences);
    return evaluation.flaggedIngredients.map(f => f.ingredient);
  }
}