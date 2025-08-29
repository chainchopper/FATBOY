import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OcrEnhancerService {
  
  preprocessText(text: string): string {
    // Common OCR corrections
    const corrections: {[key: string]: string} = {
      '0': 'O', // Common OCR mistake
      '1': 'I',
      '5': 'S',
      '8': 'B',
      '\\|': 'I',
      '\\$': 'S',
      '\\^': '',
      '`': '',
      '~': '',
      '\\+': 't', // Often misread as t
    };
    
    let processedText = text;
    
    // Apply corrections
    for (const [pattern, replacement] of Object.entries(corrections)) {
      processedText = processedText.replace(new RegExp(pattern, 'g'), replacement);
    }
    
    // Remove common OCR artifacts
    processedText = processedText.replace(/\s+/g, ' '); // Multiple spaces to single
    processedText = processedText.replace(/(\w)([A-Z])/g, '$1 $2'); // Add space between camelCase
    processedText = processedText.replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between lower and upper case
    
    return processedText;
  }
  
  enhanceIngredientDetection(text: string): string[] {
    const processedText = this.preprocessText(text);
    const lines = processedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let ingredients: string[] = [];
    let inIngredientsSection = false;
    let ingredientsEnded = false;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Detect ingredients section start
      if (!inIngredientsSection && (lowerLine.includes('ingredients') || lowerLine.includes('contains'))) {
        inIngredientsSection = true;
        continue;
      }
      
      // Detect ingredients section end
      if (inIngredientsSection && !ingredientsEnded) {
        if (lowerLine.includes('nutrition') || 
            lowerLine.includes('allergen') || 
            lowerLine.includes('may contain') ||
            lowerLine.match(/^\d/)) {
          ingredientsEnded = true;
          continue;
        }
        
        // Process ingredients line
        if (inIngredientsSection && !ingredientsEnded) {
          const lineIngredients = this.extractIngredientsFromLine(line);
          ingredients = [...ingredients, ...lineIngredients];
        }
      }
    }
    
    // Fallback if we couldn't find ingredients section
    if (ingredients.length === 0) {
      ingredients = this.fallbackIngredientExtraction(processedText);
    }
    
    return ingredients.filter((ingredient, index, array) => 
      ingredient.length > 0 && array.indexOf(ingredient) === index
    );
  }
  
  private extractIngredientsFromLine(line: string): string[] {
    // Split by common separators, but be smart about it
    const separators = /[,;()\[\]]/;
    return line.split(separators)
      .map(part => part.trim())
      .filter(part => part.length > 1 && !part.match(/^\d/)) // Remove numbers and very short parts
      .filter(part => !part.toLowerCase().includes('ingredients')); // Remove any remaining "ingredients" text
  }
  
  private fallbackIngredientExtraction(text: string): string[] {
    // Try to find ingredients by common patterns
    const ingredientPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z]?[a-z]*)+)/g, // Capitalized words (likely ingredients)
      /(\b(?:organic|natural|non-gmo|grass-fed|free-range)\s+[a-z]+\b)/gi, // Common prefixes
    ];
    
    const ingredients: string[] = [];
    
    for (const pattern of ingredientPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        ingredients.push(match[0].trim());
      }
    }
    
    return ingredients;
  }
  
  detectProductName(text: string): string {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for likely product name patterns
    for (const line of lines) {
      // Skip lines that are clearly not product names
      if (line.length < 2 || 
          line.length > 50 || 
          line.match(/ingredients|nutrition|allergen|contains|serving/i) ||
          line.match(/^\d/)) {
        continue;
      }
      
      // Lines with mixed case are good candidates
      if (line.match(/[a-z]/) && line.match(/[A-Z]/)) {
        return line;
      }
    }
    
    // Fallback to first line
    return lines[0] || 'Unknown Product';
  }
  
  detectBrand(text: string): string {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for brand indicators
    for (const line of lines) {
      if (line.match(/(inc|llc|co\.|corporation|company|©|™|®)/i)) {
        return line;
      }
      
      // Short lines in all caps might be brands
      if (line.length <= 20 && line === line.toUpperCase()) {
        return line;
      }
    }
    
    // Fallback to second line if first looks like a product name
    if (lines.length > 1 && this.looksLikeProductName(lines[0])) {
      return lines[1];
    }
    
    return 'Unknown Brand';
  }
  
  private looksLikeProductName(text: string): boolean {
    return text.length > 2 && text.length < 50 && /[a-z]/i.test(text);
  }
}