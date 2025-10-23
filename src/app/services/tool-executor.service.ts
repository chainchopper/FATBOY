import { Injectable } from '@angular/core';
import { ShoppingListService } from './shopping-list.service';
import { FoodDiaryService, MealType } from './food-diary.service';
import { PreferencesService } from './preferences.service';
import { Product } from './product-db.service';
import { Router } from '@angular/router';
import { DynamicButton, UiElement } from './ai-integration.service';
import { supabase } from '../../integrations/supabase/client';
import { NotificationService } from './notification.service';

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
    private router: Router,
    private notificationService: NotificationService
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
            this.notificationService.showSuccess(`Added "${productToAdd.name}" to ${functionArgs.meal_type}.`, 'Food Diary');
          } else {
            toolOutput = `AWAITING_MEAL_TYPE: Please select a meal type for "${productToAdd.name}".`;
            humanReadableSummary = `What meal type is "${productToAdd.name}" for?`;
            dynamicButtons = [
              { text: '🍳 Breakfast', action: 'add_to_food_diary_meal_select', payload: { product_name: productToAdd.name, brand: productToAdd.brand, meal_type: 'Breakfast' } },
              { text: '🥗 Lunch', action: 'add_to_food_diary_meal_select', payload: { product_name: productToAdd.name, brand: productToAdd.brand, meal_type: 'Lunch' } },
              { text: '🍲 Dinner', action: 'add_to_food_diary_meal_select', payload: { product_name: productToAdd.name, brand: productToAdd.brand, meal_type: 'Dinner' } },
              { text: '🍎 Snack', action: 'add_to_food_diary_meal_select', payload: { product_name: productToAdd.name, brand: productToAdd.brand, meal_type: 'Snack' } },
              { text: '🥤 Drinks', action: 'add_to_food_diary_meal_select', payload: { product_name: productToAdd.name, brand: productToAdd.brand, meal_type: 'Drinks' } },
            ];
            uiElements = [{ type: 'product_card', data: productToAdd }];
            this.notificationService.showInfo(`Select a meal for "${productToAdd.name}".`, 'Food Diary');
          }
        } else {
          toolOutput = `FAILED: Missing product name or brand.`;
          humanReadableSummary = `Failed to add to food diary.`;
          this.notificationService.showError('Missing product details to add to diary.', 'Food Diary');
        }
        break;

      case 'add_to_shopping_list':
        if (productToAdd.name && productToAdd.brand) {
          const isOnList = this.shoppingListService.isItemOnList(productToAdd.id);
          if (isOnList) {
            toolOutput = `PRODUCT_EXISTS: The product '${productToAdd.name}' is already on the shopping list. Inform the user of this.`;
            humanReadableSummary = `"${productToAdd.name}" is already on your shopping list.`;
            this.notificationService.showWarning(`"${productToAdd.name}" is already on your shopping list.`);
          } else {
            await this.shoppingListService.addItem(productToAdd);
            toolOutput = `PRODUCT_ADDED: The product '${productToAdd.name}' was successfully added to the shopping list. Confirm this with the user.`;
            humanReadableSummary = `Adding "${productToAdd.name}" to shopping list.`;
            // ShoppingListService already toasts on success
          }
          uiElements = [{ type: 'product_card', data: productToAdd }];
        } else {
          toolOutput = `FAILED: Missing product name or brand.`;
          humanReadableSummary = `Failed to add to shopping list.`;
          this.notificationService.showError('Missing product details to add to shopping list.', 'Shopping List');
        }
        break;

      case 'remove_from_shopping_list':
        if (functionArgs.product_name) {
          await this.shoppingListService.removeItemByName(functionArgs.product_name);
          toolOutput = `PRODUCT_REMOVED: Successfully removed "${functionArgs.product_name}" from the shopping list.`;
          humanReadableSummary = `Removing "${functionArgs.product_name}" from your shopping list.`;
          // ShoppingListService already toasts on remove
        } else {
          toolOutput = `FAILED: Missing product name.`;
          humanReadableSummary = `Failed to remove from shopping list.`;
          this.notificationService.showError('Missing product name to remove from list.', 'Shopping List');
        }
        break;

      case 'update_avoided_ingredients':
        {
          const toAdd = functionArgs.add || [];
          const toRemove = functionArgs.remove || [];
          toAdd.forEach((ing: string) => this.preferencesService.addCustomAvoidedIngredient(ing));
          toRemove.forEach((ing: string) => this.preferencesService.removeAvoidedIngredient(ing));

          let outputParts: string[] = [];
          if (toAdd.length > 0) outputParts.push(`Added: ${toAdd.join(', ')}.`);
          if (toRemove.length > 0) outputParts.push(`Removed: ${toRemove.join(', ')}.`);

          toolOutput = `PREFERENCES_UPDATED: ${outputParts.join(' ')}`;
          humanReadableSummary = `Updating your ingredient preferences.`;
          if (toAdd.length || toRemove.length) {
            this.notificationService.showSuccess(`Preferences updated. ${outputParts.join(' ')}`, 'Avoid List');
          } else {
            this.notificationService.showInfo('No changes to preferences.', 'Avoid List');
          }
        }
        break;

      case 'summarize_food_diary':
        {
          const date = functionArgs.date || new Date().toISOString().split('T')[0];
          const summary = this.foodDiaryService.getDailySummary(date);
          toolOutput = `DIARY_SUMMARY: Date: ${date}, Total Calories: ${summary.totalCalories}, Flagged Items: ${summary.totalFlaggedItems}, Top Flagged: ${Object.keys(summary.flaggedIngredients).slice(0,3).join(', ')}.`;
          humanReadableSummary = `Summarizing your food diary for ${date}.`;
          this.notificationService.showInfo(`Diary ${date}: ${summary.totalCalories} kcal, ${summary.totalFlaggedItems} flagged.`, 'Food Diary');
        }
        break;

      case 'open_scanner':
        this.router.navigate(['/scanner']);
        toolOutput = `SCANNER_OPENED: Navigated user to the unified scanner.`;
        humanReadableSummary = `Opening the unified scanner.`;
        this.notificationService.showInfo('Opening scanner...', 'Scanner');
        break;

      case 'search_products':
        {
          const { data: searchResults, error } = await supabase.functions.invoke('search-products', {
            body: { query: functionArgs.query }
          });

          if (error) {
            toolOutput = `FAILED: Error searching for products: ${error.message}`;
            humanReadableSummary = `Failed to search for products.`;
            this.notificationService.showError('Failed to search products. Please try again.', 'Search');
          } else if (searchResults && searchResults.length > 0) {
            toolOutput = `PRODUCT_SEARCH_SUCCESS: Found ${searchResults.length} products matching "${functionArgs.query}". The results are displayed as UI elements.`;
            humanReadableSummary = `Searching for products matching "${functionArgs.query}"...`;
            uiElements = searchResults.map((product: Product) => ({
              type: 'product_card',
              data: product
            }));
            this.notificationService.showSuccess(`Found ${searchResults.length} product(s).`, 'Search');
          } else {
            toolOutput = `PRODUCT_SEARCH_EMPTY: No products found matching "${functionArgs.query}".`;
            humanReadableSummary = `Couldn't find any products matching "${functionArgs.query}".`;
            this.notificationService.showInfo(`No products found for "${functionArgs.query}".`, 'Search');
          }
        }
        break;

      case 'search_external_database':
        {
          const { data: externalResults, error: externalError } = await supabase.functions.invoke('search-open-food-facts', {
            body: { query: functionArgs.query }
          });

          if (externalError) {
            toolOutput = `FAILED: Error searching external database: ${externalError.message}`;
            humanReadableSummary = `Failed to search the public database.`;
            this.notificationService.showError('Failed to search public database. Try again later.', 'Public Search');
          } else if (externalResults && externalResults.length > 0) {
            toolOutput = `EXTERNAL_SEARCH_SUCCESS: Found ${externalResults.length} products in the public database matching "${functionArgs.query}". The results are displayed as UI elements.`;
            humanReadableSummary = `Searching the public database for "${functionArgs.query}"...`;
            uiElements = externalResults.map((product: Product) => ({
              type: 'product_card',
              data: product
            }));
            this.notificationService.showSuccess(`Found ${externalResults.length} public result(s).`, 'Public Search');
          } else {
            toolOutput = `EXTERNAL_SEARCH_EMPTY: No products found in the public database matching "${functionArgs.query}".`;
            humanReadableSummary = `Couldn't find any products in the public database matching "${functionArgs.query}".`;
            this.notificationService.showInfo(`No public results for "${functionArgs.query}".`, 'Public Search');
          }
        }
        break;

      default:
        toolOutput = `Unknown tool: ${functionName}`;
        humanReadableSummary = `Unknown action.`;
        this.notificationService.showWarning(`Unknown action requested: ${functionName}`);
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