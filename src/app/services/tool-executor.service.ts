import { Injectable } from '@angular/core';
import { ShoppingListService } from './shopping-list.service';
import { FoodDiaryService, MealType } from './food-diary.service';
import { PreferencesService } from './preferences.service';
import { Product } from './product-db.service';
import { Router } from '@angular/router'; // Import Router
import { DynamicButton, UiElement } from './ai-integration.service'; // Import DynamicButton and UiElement
import { supabase } from '../../integrations/supabase/client';

export interface ToolExecutionResult {
  tool_call_id: string;
  output: string;
  humanReadableSummary: string;
  dynamicButtons?: DynamicButton[];
  uiElements?: UiElement[];
}

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

  async executeTool(toolCall: any, lastDiscussedProduct: Product | null): Promise<ToolExecutionResult> {
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);
    let toolOutput = '';
    let humanReadableSummary = '';
    let dynamicButtons: DynamicButton[] | undefined;
    let uiElements: UiElement[] | undefined;

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
        if (productToAdd.name && productToAdd.brand) {
          if (functionArgs.meal_type) {
            await this.foodDiaryService.addEntry(productToAdd, functionArgs.meal_type as MealType);
            toolOutput = `PRODUCT_ADDED: Successfully added "${productToAdd.name}" to food diary for ${functionArgs.meal_type}.`;
            humanReadableSummary = `Adding "${productToAdd.name}" to ${functionArgs.meal_type}.`;
          } else {
            // If meal_type is missing, prompt the user with dynamic buttons
            toolOutput = `AWAITING_MEAL_TYPE: Please select a meal type for "${productToAdd.name}".`;
            humanReadableSummary = `What meal type is "${productToAdd.name}" for?`;
            dynamicButtons = [
              { text: '🍳 Breakfast', action: 'add_to_food_diary_meal_select', payload: { product_name: productToAdd.name, brand: productToAdd.brand, meal_type: 'Breakfast' } },
              { text: '🥗 Lunch', action: 'add_to_food_diary_meal_select', payload: { product_name: productToAdd.name, brand: productToAdd.brand, meal_type: 'Lunch' } },
              { text: '🍲 Dinner', action: 'add_to_food_diary_meal_select', payload: { product_name: productToAdd.name, brand: productToAdd.brand, meal_type: 'Dinner' } },
              { text: '🍎 Snack', action: 'add_to_food_diary_meal_select', payload: { product_name: productToAdd.name, brand: productToAdd.brand, meal_type: 'Snack' } },
              { text: '🥤 Drinks', action: 'add_to_food_diary_meal_select', payload: { product_name: productToAdd.name, brand: productToAdd.brand, meal_type: 'Drinks' } },
            ];
            // Also include the product card for context
            uiElements = [{ type: 'product_card', data: productToAdd }];
          }
        } else {
          toolOutput = `FAILED: Missing product name or brand.`;
          humanReadableSummary = `Failed to add to food diary.`;
        }
        break;
      case 'add_to_shopping_list':
        if (productToAdd.name && productToAdd.brand) {
          const isOnList = this.shoppingListService.isItemOnList(productToAdd.id);
          if (isOnList) {
            toolOutput = `PRODUCT_EXISTS: The product '${productToAdd.name}' is already on the shopping list. Inform the user of this.`;
            humanReadableSummary = `"${productToAdd.name}" is already on your shopping list.`;
          } else {
            await this.shoppingListService.addItem(productToAdd);
            toolOutput = `PRODUCT_ADDED: The product '${productToAdd.name}' was successfully added to the shopping list. Confirm this with the user.`;
            humanReadableSummary = `Adding "${productToAdd.name}" to shopping list.`;
          }
          uiElements = [{ type: 'product_card', data: productToAdd }];
        } else {
          toolOutput = `FAILED: Missing product name or brand.`;
          humanReadableSummary = `Failed to add to shopping list.`;
        }
        break;
      case 'remove_from_shopping_list':
        if (functionArgs.product_name) {
          await this.shoppingListService.removeItemByName(functionArgs.product_name);
          toolOutput = `PRODUCT_REMOVED: Successfully removed "${functionArgs.product_name}" from the shopping list.`;
          humanReadableSummary = `Removing "${functionArgs.product_name}" from your shopping list.`;
        } else {
          toolOutput = `FAILED: Missing product name.`;
          humanReadableSummary = `Failed to remove from shopping list.`;
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
      case 'search_products':
        const { data: searchResults, error } = await supabase.functions.invoke('search-products', {
          body: { query: functionArgs.query }
        });

        if (error) {
          toolOutput = `FAILED: Error searching for products: ${error.message}`;
          humanReadableSummary = `Failed to search for products.`;
        } else if (searchResults && searchResults.length > 0) {
          toolOutput = `PRODUCT_SEARCH_SUCCESS: Found ${searchResults.length} products matching "${functionArgs.query}". The results are displayed as UI elements.`;
          humanReadableSummary = `Searching for products matching "${functionArgs.query}"...`;
          uiElements = searchResults.map((product: Product) => ({
            type: 'product_card',
            data: product
          }));
        } else {
          toolOutput = `PRODUCT_SEARCH_EMPTY: No products found matching "${functionArgs.query}".`;
          humanReadableSummary = `Couldn't find any products matching "${functionArgs.query}".`;
        }
        break;
      case 'search_external_database':
        const { data: externalResults, error: externalError } = await supabase.functions.invoke('search-open-food-facts', {
          body: { query: functionArgs.query }
        });

        if (externalError) {
          toolOutput = `FAILED: Error searching external database: ${externalError.message}`;
          humanReadableSummary = `Failed to search the public database.`;
        } else if (externalResults && externalResults.length > 0) {
          toolOutput = `EXTERNAL_SEARCH_SUCCESS: Found ${externalResults.length} products in the public database matching "${functionArgs.query}". The results are displayed as UI elements.`;
          humanReadableSummary = `Searching the public database for "${functionArgs.query}"...`;
          uiElements = externalResults.map((product: Product) => ({
            type: 'product_card',
            data: product
          }));
        } else {
          toolOutput = `EXTERNAL_SEARCH_EMPTY: No products found in the public database matching "${functionArgs.query}".`;
          humanReadableSummary = `Couldn't find any products in the public database matching "${functionArgs.query}".`;
        }
        break;
      default:
        toolOutput = `Unknown tool: ${functionName}`;
        console.warn(toolOutput);
        humanReadableSummary = `Unknown action.`;
    }

    return {
      tool_call_id: toolCall.id,
      output: toolOutput,
      humanReadableSummary,
      dynamicButtons,
      uiElements
    };
  }
}