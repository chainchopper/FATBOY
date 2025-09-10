import { Injectable } from '@angular/core';
import { ShoppingListService } from './shopping-list.service';
import { FoodDiaryService, MealType } from './food-diary.service';
import { PreferencesService } from './preferences.service';
import { Product } from './product-db.service';
import { Router } from '@angular/router'; // Import Router

@Injectable({
  providedIn: 'root'
})
export class ToolExecutorService {

  constructor(
    private shoppingListService: ShoppingListService,
    private foodDiaryService: FoodDiaryService,
    private preferencesService: PreferencesService,
    private router: Router // Inject Router
  ) { }

  async executeTool(toolCall: any, lastDiscussedProduct: Product | null): Promise<{ tool_call_id: string; output: string; humanReadableSummary: string; }> {
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);
    let toolOutput = '';
    let humanReadableSummary = '';

    let productName = functionArgs.product_name;
    let brand = functionArgs.brand;

    if (!productName && lastDiscussedProduct) {
      productName = lastDiscussedProduct.name;
    }
    if (!brand && lastDiscussedProduct) {
      brand = lastDiscussedProduct.brand;
    }

    const productToAdd: Product = {
      id: lastDiscussedProduct?.id || Date.now().toString(),
      name: productName || 'Unknown Product',
      brand: brand || 'Unknown Brand',
      ingredients: lastDiscussedProduct?.ingredients || [],
      categories: lastDiscussedProduct?.categories || [],
      verdict: lastDiscussedProduct?.verdict || 'good',
      flaggedIngredients: lastDiscussedProduct?.flaggedIngredients || [],
      scanDate: new Date(),
      image: lastDiscussedProduct?.image || 'https://via.placeholder.com/150?text=AI+Added'
    };

    switch (functionName) {
      case 'add_to_food_diary':
        if (productToAdd.name && productToAdd.brand && functionArgs.meal_type) {
          await this.foodDiaryService.addEntry(productToAdd, functionArgs.meal_type as MealType);
          toolOutput = `PRODUCT_ADDED: Successfully added "${productToAdd.name}" to food diary for ${functionArgs.meal_type}.`;
          humanReadableSummary = `Adding "${productToAdd.name}" to ${functionArgs.meal_type}.`;
        } else {
          toolOutput = `FAILED: Missing product name, brand, or meal type.`;
        }
        break;
      case 'add_to_shopping_list':
        if (productToAdd.name && productToAdd.brand) {
          const isOnList = this.shoppingListService.isItemOnList(productToAdd.id);
          if (isOnList) {
            toolOutput = `PRODUCT_EXISTS: The product '${productToAdd.name}' is already on the shopping list. Inform the user of this.`;
          } else {
            await this.shoppingListService.addItem(productToAdd);
            toolOutput = `PRODUCT_ADDED: The product '${productToAdd.name}' was successfully added to the shopping list. Confirm this with the user.`;
          }
          humanReadableSummary = `Adding "${productToAdd.name}" to shopping list.`;
        } else {
          toolOutput = `FAILED: Missing product name or brand.`;
        }
        break;
      case 'remove_from_shopping_list':
        if (functionArgs.product_name) {
          await this.shoppingListService.removeItemByName(functionArgs.product_name);
          toolOutput = `PRODUCT_REMOVED: Successfully removed "${functionArgs.product_name}" from the shopping list.`;
          humanReadableSummary = `Removing "${functionArgs.product_name}" from your shopping list.`;
        } else {
          toolOutput = `FAILED: Missing product name.`;
        }
        break;
      case 'update_avoided_ingredients':
        const toAdd = functionArgs.add || [];
        const toRemove = functionArgs.remove || [];
        
        toAdd.forEach((ing: string) => this.preferencesService.addCustomAvoidedIngredient(ing));
        toRemove.forEach((ing: string) => this.preferencesService.removeAvoidedIngredient(ing));
        
        let outputParts = [];
        if (toAdd.length > 0) outputParts.push(`Added: ${toAdd.join(', ')}.`);
        if (toRemove.length > 0) outputParts.push(`Removed: ${toRemove.join(', ')}.`);
        toolOutput = `PREFERENCES_UPDATED: ${outputParts.join(' ')}`;
        humanReadableSummary = `Updating your ingredient preferences.`;
        break;
      case 'summarize_food_diary':
        const date = functionArgs.date || new Date().toISOString().split('T')[0];
        const summary = this.foodDiaryService.getDailySummary(date);
        toolOutput = `DIARY_SUMMARY: Date: ${date}, Total Calories: ${summary.totalCalories}, Flagged Items: ${summary.totalFlaggedItems}, Top Flagged: ${Object.keys(summary.flaggedIngredients).slice(0,3).join(', ')}.`;
        humanReadableSummary = `Summarizing your food diary for ${date}.`;
        break;
      case 'open_scanner':
        this.router.navigate(['/scanner']);
        toolOutput = `SCANNER_OPENED: Navigated user to the unified scanner.`;
        humanReadableSummary = `Opening the unified scanner.`;
        break;
      default:
        toolOutput = `Unknown tool: ${functionName}`;
        console.warn(toolOutput);
    }

    return {
      tool_call_id: toolCall.id,
      output: toolOutput,
      humanReadableSummary
    };
  }
}