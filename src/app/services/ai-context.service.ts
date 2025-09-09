import { Injectable } from '@angular/core';
import { ProductDbService } from './product-db.service';
import { ProfileService } from './profile.service';
import { PreferencesService } from './preferences.service';
import { ShoppingListService } from './shopping-list.service';
import { FoodDiaryService } from './food-diary.service';
import { GamificationService } from './gamification.service';
import { Product } from './product-db.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiContextService {

  constructor(
    private productDb: ProductDbService,
    private profileService: ProfileService,
    private preferencesService: PreferencesService,
    private shoppingListService: ShoppingListService,
    private foodDiaryService: FoodDiaryService,
    private gamificationService: GamificationService
  ) { }

  async buildUserContext(lastDiscussedProduct: Product | null): Promise<string> {
    const userProfile = await firstValueFrom(this.profileService.getProfile());
    const userPreferences = this.preferencesService.getPreferences();
    const scanHistory = this.productDb.getProductsSnapshot();
    const shoppingList = await firstValueFrom(this.shoppingListService.list$);
    const foodDiaryMap = await firstValueFrom(this.foodDiaryService.diary$);
    const badges = await firstValueFrom(this.gamificationService.badges$);

    const recentScansSummary = scanHistory.slice(0, 5).map(p => `${p.name} (${p.brand}, verdict: ${p.verdict})`).join('; ') || 'No recent scans.';
    const shoppingListSummary = shoppingList.map(item => `${item.product_name} (${item.brand}, purchased: ${item.purchased})`).join('; ') || 'Shopping list is empty.';
    
    let dailyDiarySummary = 'No diary entries for today.';
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = foodDiaryMap.get(today);
    if (todayEntries && todayEntries.length > 0) {
      const summary = this.foodDiaryService.getDailySummary(today);
      dailyDiarySummary = `Today's calories: ${summary.totalCalories}, flagged items: ${summary.totalFlaggedItems}. Top flagged: ${Object.keys(summary.flaggedIngredients).slice(0,3).join(', ')}.`;
    }

    const unlockedBadges = badges.filter(b => b.unlocked).map(b => b.name).join(', ') || 'No badges unlocked yet.';

    let lastProductContext = '';
    if (lastDiscussedProduct) {
      lastProductContext = `The user recently discussed/scanned: ${lastDiscussedProduct.name} by ${lastDiscussedProduct.brand}. Ingredients: ${lastDiscussedProduct.ingredients.join(', ')}. Verdict: ${lastDiscussedProduct.verdict}.`;
    }

    return `
      User Profile: ${userProfile?.first_name || 'Anonymous'} ${userProfile?.last_name || ''}
      Health Goal: ${userPreferences.goal}
      Avoided Ingredients: ${userPreferences.avoidedIngredients.join(', ')}
      Custom Avoided Ingredients: ${userPreferences.customAvoidedIngredients.join(', ')}
      Max Calories per Serving: ${userPreferences.maxCalories}
      Daily Calorie Target: ${userPreferences.dailyCalorieTarget}
      Recent Scans (last 5): ${recentScansSummary}
      Shopping List: ${shoppingListSummary}
      Today's Food Diary: ${dailyDiarySummary}
      Unlocked Achievements: ${unlockedBadges}
      ${lastProductContext}
    `;
  }
}