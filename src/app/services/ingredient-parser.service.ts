import { Injectable } from '@angular/core';

export interface IngredientAnalysis {
  categories: string[];
  flagged: boolean;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IngredientParserService {
  private ingredientCategories = {
    artificialSweeteners: ['aspartame', 'sucralose', 'saccharin', 'acesulfame', 'neotame', 'advantame'],
    artificialColors: ['red 40', 'yellow 5', 'blue 1', 'red 3', 'yellow 6', 'blue 2', 'green 3'],
    preservatives: ['bht', 'bha', 'tbHQ', 'sodium benzoate', 'potassium sorbate', 'sodium nitrate', 'sodium nitrite'],
    hfcs: ['high-fructose corn syrup', 'hfcs'],
    msg: ['monosodium glutamate', 'msg', 'glutamate'],
    transFats: ['partially hydrogenated', 'hydrogenated oil', 'shortening'],
    natural: ['organic', 'natural', 'non-gmo', 'grass-fed', 'free-range'],
    allergens: ['milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soybeans']
  };

  analyzeIngredient(ingredient: string): IngredientAnalysis {
    const lowerIngredient = ingredient.toLowerCase();
    const categories: string[] = [];
    let flagged = false;
    let reason: string | undefined;

    // Check each category
    for (const [category, keywords] of Object.entries(this.ingredientCategories)) {
      if (keywords.some(keyword => lowerIngredient.includes(keyword))) {
        categories.push(category);
        
        // Flag if it's in avoid categories
        if (['artificialSweeteners', 'artificialColors', 'preservatives', 'hfcs', 'msg', 'transFats'].includes(category)) {
          flagged = true;
          reason = `Contains ${category}`;
        }
      }
    }

    return { categories, flagged, reason };
  }

  parseIngredientList(text: string): string[] {
    // Improved parsing logic
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let ingredients: string[] = [];
    let inIngredientsSection = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Detect ingredients section
      if (lowerLine.includes('ingredients') || lowerLine.includes('contains')) {
        inIngredientsSection = true;
        continue;
      }
      
      // Detect end of ingredients section
      if (inIngredientsSection && 
          (lowerLine.includes('nutrition') || 
           lowerLine.includes('allergen') || 
           lowerLine.includes('may contain') ||
           lowerLine.match(/^\d/))) { // Lines starting with numbers (nutrition facts)
        break;
      }
      
      if (inIngredientsSection) {
        // Split by common separators and clean up
        const lineIngredients = line.split(/[,;()\[\]]/).map(part => part.trim()).filter(part => part.length > 0);
        ingredients = [...ingredients, ...lineIngredients];
      }
    }

    // If we couldn't find an ingredients section, try to extract from the whole text
    if (ingredients.length === 0) {
      ingredients = text.split(/[,;()\[\]]/).map(part => part.trim()).filter(part => part.length > 2);
    }

    return ingredients.filter((ingredient, index, array) => 
      ingredient.length > 0 && array.indexOf(ingredient) === index
    );
  }

  categorizeProduct(ingredients: string[]): string[] {
    const categories = new Set<string>();
    
    ingredients.forEach(ingredient => {
      const analysis = this.analyzeIngredient(ingredient);
      analysis.categories.forEach(category => categories.add(category));
    });
    
    return Array.from(categories);
  }
}