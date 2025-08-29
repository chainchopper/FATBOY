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
  // Add the missing analyzeIngredient method
  analyzeIngredient(ingredient: string): IngredientAnalysis {
    // Simple implementation - flag ingredients containing "artificial" or "preservative"
    const lowerIngredient = ingredient.toLowerCase();
    const flagged = lowerIngredient.includes('artificial') || lowerIngredient.includes('preservative');
    
    return {
      categories: this.getCategoriesForIngredient(lowerIngredient),
      flagged: flagged,
      reason: flagged ? 'Contains artificial ingredients or preservatives' : undefined
    };
  }

  // Add the missing categorizeProduct method
  categorizeProduct(ingredients: string[]): string[] {
    const categories = new Set<string>();
    
    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      const analysis = this.analyzeIngredient(lowerIngredient);
      analysis.categories.forEach(category => categories.add(category));
    });
    
    return Array.from(categories);
  }

  // Helper method to categorize individual ingredients
  private getCategoriesForIngredient(ingredient: string): string[] {
    const categories: string[] = [];
    
    if (ingredient.includes('artificial')) {
      categories.push('artificial');
    }
    if (ingredient.includes('preservative')) {
      categories.push('preservatives');
    }
    if (ingredient.includes('sweetener')) {
      categories.push('sweeteners');
    }
    if (ingredient.includes('natural')) {
      categories.push('natural');
    }
    
    return categories.length > 0 ? categories : ['other'];
  }

  // Existing method
  evaluateIngredients(ingredients: string[], preferences: any): string[] {
    const flagged: string[] = [];
    ingredients.forEach(ingredient => {
      const analysis = this.analyzeIngredient(ingredient);
      if (analysis.flagged) {
        flagged.push(ingredient);
      }
    });
    return flagged;
  }
}