import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from './product-db.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { SpeechService } from './speech.service';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  meal: MealType;
  product: Product;
}

export type DailyVerdict = 'excellent' | 'good' | 'fair' | 'poor';

@Injectable({
  providedIn: 'root'
})
export class FoodDiaryService {
  private diary = new Map<string, DiaryEntry[]>();
  private diarySubject = new BehaviorSubject<Map<string, DiaryEntry[]>>(this.diary);
  public diary$ = this.diarySubject.asObservable();
  private currentUserId: string | null = null;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private speechService: SpeechService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadFromStorage(); // Reload data when user changes
    });
  }

  addEntry(product: Product, meal: MealType): void {
    const today = new Date().toISOString().split('T')[0];
    const newEntry: DiaryEntry = {
      id: `${today}-${Date.now()}`,
      date: today,
      meal,
      product
    };

    const entries = this.diary.get(today) || [];
    entries.push(newEntry);
    this.diary.set(today, entries);
    
    this.saveToStorage();
    this.diarySubject.next(new Map(this.diary));
    this.notificationService.showSuccess(`${product.name} added to ${meal}.`);
    this.speechService.speak(`${product.name} added to ${meal}.`);
  }

  getEntriesForDate(date: string): DiaryEntry[] {
    return this.diary.get(date) || [];
  }

  getDailySummary(date: string): { totalCalories: number; totalFlaggedItems: number; flaggedIngredients: { [key: string]: number } } {
    const entries = this.getEntriesForDate(date);
    let totalCalories = 0;
    let totalFlaggedItems = 0;
    const flaggedIngredients: { [key: string]: number } = {};

    entries.forEach(entry => {
      if (entry.product.calories) {
        totalCalories += entry.product.calories;
      }
      if (entry.product.flaggedIngredients) {
        totalFlaggedItems += entry.product.flaggedIngredients.length;
        entry.product.flaggedIngredients.forEach(ingredient => {
          flaggedIngredients[ingredient] = (flaggedIngredients[ingredient] || 0) + 1;
        });
      }
    });

    return { totalCalories, totalFlaggedItems, flaggedIngredients };
  }

  getDailyPerformanceVerdict(date: string, preferences: any): DailyVerdict {
    const summary = this.getDailySummary(date);
    const { totalCalories, totalFlaggedItems } = summary;

    // Simple heuristic for now, can be expanded with more complex AI
    let score = 0;

    // Calorie-based scoring
    if (preferences.dailyCalorieTarget) { // Use dailyCalorieTarget from preferences
      const calorieTarget = preferences.dailyCalorieTarget;
      if (totalCalories <= calorieTarget) {
        score += 2; // Good on calories
      } else if (totalCalories <= calorieTarget * 1.1) { // 10% over is still 'fair'
        score += 1;
      } else {
        score -= 1; // Significantly over
      }
    } else if (preferences.maxCalories) { // Fallback to old maxCalories if daily not set
      const calorieTarget = preferences.maxCalories * 3; // Assuming 3 meals for a rough daily target
      if (totalCalories <= calorieTarget) {
        score += 2; // Good on calories
      } else if (totalCalories <= calorieTarget * 1.2) {
        score += 1; // Slightly over
      } else {
        score -= 1; // Significantly over
      }
    }


    // Flagged ingredients scoring
    if (totalFlaggedItems === 0) {
      score += 3; // No flagged items, excellent!
    } else if (totalFlaggedItems <= 2) {
      score += 1; // Few flagged items
    } else {
      score -= 2; // Many flagged items
    }

    // Goal-based adjustments (example)
    if (preferences.goal === 'strictlyNatural' && totalFlaggedItems > 0) {
      score -= 1; // Penalize more for natural goal if flagged items exist
    }
    if (preferences.goal === 'calorieCount' && preferences.dailyCalorieTarget && totalCalories > preferences.dailyCalorieTarget) {
      score -= 1; // Penalize more for calorie goal if over target
    }

    if (score >= 4) {
      return 'excellent';
    } else if (score >= 2) {
      return 'good';
    } else if (score >= 0) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  private getStorageKey(): string {
    return this.currentUserId ? `fatBoyFoodDiary_${this.currentUserId}` : 'fatBoyFoodDiary_anonymous';
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.getStorageKey());
    if (stored) {
      this.diary = new Map(JSON.parse(stored));
      this.diarySubject.next(new Map(this.diary));
    } else {
      this.diary = new Map();
      this.diarySubject.next(new Map());
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(Array.from(this.diary.entries())));
  }
}