import { Injectable } from '@angular/core';
import { ProductDbService, Product } from './product-db.service';
import { IngredientParserService } from './ingredient-parser.service';
import { PreferencesService } from './preferences.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ProductManagerService {

  constructor(
    private productDb: ProductDbService,
    private ingredientParser: IngredientParserService,
    private preferencesService: PreferencesService,
    private notificationService: NotificationService
  ) { }

  /**
   * Takes partial product data, evaluates it against user preferences,
   * adds it to the database, and returns the full, saved product.
   * This is the central method for adding any new product to the system.
   */
  public async processAndAddProduct(
    partialProductData: Omit<Product, 'id' | 'scanDate' | 'verdict' | 'flaggedIngredients' | 'categories'>
  ): Promise<Product | null> {
    
    const preferences = this.preferencesService.getPreferences();
    const ingredients = partialProductData.ingredients && partialProductData.ingredients.length > 0
      ? partialProductData.ingredients
      : ["Ingredients not available"];

    const evaluation = this.ingredientParser.evaluateProduct(ingredients, partialProductData.calories, preferences);
    const categories = this.ingredientParser.categorizeProduct(ingredients);

    const fullProductData: Omit<Product, 'id' | 'scanDate'> = {
      ...partialProductData,
      ingredients,
      categories,
      verdict: evaluation.verdict,
      flaggedIngredients: evaluation.flaggedIngredients.map(f => f.ingredient),
      image: partialProductData.image || "https://via.placeholder.com/150",
    };

    const savedProduct = await this.productDb.addProduct(fullProductData);
    
    if (savedProduct) {
      this.notificationService.showSuccess(`Saved "${savedProduct.name}"!`, 'Product Added');
      this.productDb.setLastViewedProduct(savedProduct);
    } else {
      this.notificationService.showError('Failed to save the product.', 'Save Error');
    }

    return savedProduct;
  }
}