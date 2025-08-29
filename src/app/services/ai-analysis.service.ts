import { Injectable } from '@angular/core';
import { IngredientParserService, IngredientAnalysis } from './ingredient-parser.service';

export interface ProductAnalysis {
  verdict: 'good' | 'bad' | 'neutral';
  confidence: number;
  flaggedIngredients: string[];
  warnings: string[];
  recommendations: string[];
  nutritionalScore: number;
}

@Injectable({
  providedIn: 'root'
})
export class AiAnalysisService {

  constructor(private ingredientParser: IngredientParserService) {}

  analyzeProduct(product: any): ProductAnalysis {
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');
    const flaggedIngredients: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let nutritionalScore = 100; // Start with perfect score

    // Analyze each ingredient
    product.ingredients.forEach((ingredient: string) => {
      const analysis = this.ingredientParser.analyzeIngredient(ingredient);
      
      if (analysis.flagged) {
        flaggedIngredients.push(`${ingredient} (${analysis.reason})`);
        
        // Deduct points for bad ingredients
        if (analysis.categories.includes('artificialSweeteners')) nutritionalScore -= 15;
        if (analysis.categories.includes('artificialColors')) nutritionalScore -= 10;
        if (analysis.categories.includes('hfcs')) nutritionalScore -= 20;
        if (analysis.categories.includes('preservatives')) nutritionalScore -= 8;
        if (analysis.categories.includes('msg')) nutritionalScore -= 5;
        if (analysis.categories.includes('transFats')) nutritionalScore -= 25;
      }
      
      // Add points for good ingredients
      if (analysis.categories.includes('natural')) nutritionalScore += 5;
    });

    // Check calorie limits
    if (preferences.maxCalories && product.calories > preferences.maxCalories) {
      warnings.push(`High calorie content: ${product.calories} (your limit: ${preferences.maxCalories})`);
      nutritionalScore -= (product.calories - preferences.maxCalories) / 10;
    }

    // Determine verdict based on score and preferences
    let verdict: 'good' | 'bad' | 'neutral' = 'neutral';
    if (nutritionalScore >= 80) verdict = 'good';
    else if (nutritionalScore <= 40) verdict = 'bad';

    // Generate recommendations
    if (flaggedIngredients.length > 0) {
      recommendations.push('Consider products with fewer artificial ingredients');
    }
    if (product.calories > 300) {
      recommendations.push('High calorie product - consider smaller portions');
    }
    if (nutritionalScore < 60) {
      recommendations.push('This product has a low nutritional score');
    }

    // Calculate confidence based on data completeness
    let confidence = 0.8; // Base confidence
    if (product.ingredients.length === 0) confidence -= 0.3;
    if (!product.calories) confidence -= 0.2;

    return {
      verdict,
      confidence: Math.max(0.1, Math.min(1, confidence)),
      flaggedIngredients,
      warnings,
      recommendations,
      nutritionalScore: Math.max(0, Math.min(100, nutritionalScore))
    };
  }

  generateInsightSummary(analysis: ProductAnalysis, product: any): string {
    if (analysis.verdict === 'good') {
      return `Great choice! This product aligns well with your preferences and has a high nutritional score of ${analysis.nutritionalScore.toFixed(0)}.`;
    } else if (analysis.verdict === 'bad') {
      return `This product may not be the best choice for your goals. It has a nutritional score of ${analysis.nutritionalScore.toFixed(0)} due to: ${analysis.flaggedIngredients.slice(0, 2).join(', ')}.`;
    } else {
      return `This product is okay but could be better. Consider your specific goals when choosing this item. Nutritional score: ${analysis.nutritionalScore.toFixed(0)}.`;
    }
  }
}