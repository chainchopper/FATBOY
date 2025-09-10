import { Injectable } from '@angular/core';
import { BarcodeLookupService } from './barcode-lookup.service';
import { OpenFoodFactsService } from './open-food-facts.service';
import { IngredientParserService } from './ingredient-parser.service';
import { PreferencesService } from './preferences.service';
import { NotificationService } from './notification.service';
import { Product } from '../services/product-db.service'; // Assuming Product interface is here
import { AudioService } from './audio.service';

@Injectable({
  providedIn: 'root'
})
export class BarcodeProcessorService {

  constructor(
    private barcodeLookupService: BarcodeLookupService,
    private offService: OpenFoodFactsService,
    private ingredientParser: IngredientParserService,
    private preferencesService: PreferencesService,
    private notificationService: NotificationService,
    private audioService: AudioService
  ) { }

  async processBarcode(decodedText: string, signal: AbortSignal): Promise<Omit<Product, 'id' | 'scanDate'> | null> {
    try {
      let productData = await this.barcodeLookupService.getProductByBarcode(decodedText);

      if (signal.aborted) throw new Error('Operation aborted');

      if (!productData) {
        this.notificationService.showInfo('Primary source failed. Trying fallback...', 'Scanning');
        productData = await this.offService.getProductByBarcode(decodedText);
      }

      if (signal.aborted) throw new Error('Operation aborted');

      if (!productData) {
        this.notificationService.showWarning('Product not found in any database.', 'Not Found');
        this.audioService.playErrorSound();
        return null;
      }

      const ingredients = productData.ingredients && productData.ingredients.length > 0
        ? productData.ingredients
        : ["Ingredients not available"];

      const preferences = this.preferencesService.getPreferences();
      const categories = this.ingredientParser.categorizeProduct(ingredients);
      const evaluation = this.ingredientParser.evaluateProduct(ingredients, productData.calories, preferences);

      const productInfo: Omit<Product, 'id' | 'scanDate'> = {
        barcode: decodedText,
        name: productData.name || "Unknown Product",
        brand: productData.brand || "Unknown Brand",
        ingredients: ingredients,
        calories: productData.calories ?? undefined,
        image: productData.image || "https://via.placeholder.com/150",
        categories,
        verdict: evaluation.verdict,
        flaggedIngredients: evaluation.flaggedIngredients.map(f => f.ingredient),
        source: 'scan'
      };

      return productInfo;

    } catch (error: any) {
      if (error.message === 'Operation aborted') {
        throw error; // Re-throw to be caught by the calling function's abort handler
      } else {
        console.error('Barcode processing error:', error);
        this.notificationService.showError('Failed to process barcode.', 'Error');
        this.audioService.playErrorSound();
        return null;
      }
    }
  }
}