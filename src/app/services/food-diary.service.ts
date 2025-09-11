import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from './product-db.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { SpeechService } from './speech.service';
import { PreferencesService, UserPreferences } from './preferences.service';
import { supabase } from '../../integrations/supabase/client';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Drinks';

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  meal: MealType;
  product: Product;
}

export type DailyVerdict = 'excellent' | 'good' | 'fair' | 'poor';

export interface HistoricalDataSummary {
  labels: string[]; // Dates
  calorieData: number[];
  flaggedIngredientCounts: { [key: string]: number };
  averageCaloriesByMeal: { [key in MealType]: number };
}

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
    private speechService: SpeechService,
    private preferencesService: PreferencesService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadData();
    });
  }

  private async loadData(): Promise<void> {
    if (this.currentUserId) {
      await this.loadFromSupabase();
    } else {
      this.diary = new Map();
      this.diarySubject.next(new Map());
    }
  }

  async addEntry(product: Product, meal: MealType): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('Please log in to add items to your food diary.');
      this.speechService.speak('Please log in to add items to your food diary.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const newEntry: Omit<DiaryEntry, 'id'> = {
      date: today,
      meal,
      product
    };

    const { error } = await supabase
      .from('food_diary_entries')
      .insert({
        user_id: this.currentUserId,
        entry_date: newEntry.date,
        meal_type: newEntry.meal,
        product_data: newEntry.product
      });

    if (error) {
      console.error('Error adding food diary entry to Supabase:', error);
      this.notificationService.showError('Failed to add item to food diary.');
      this.speechService.speak('Failed to add item to food diary.');
      return;
    }
    
    supabase.rpc('fatboy_log_user_activity', { 
      activity_type: 'food_diary', 
      activity_description: `Added ${product.name} to their ${meal} diary.` 
    }).then();

    await this.loadData();
    this.notificationService.showSuccess(`${product.name} added to ${meal}.`);
    this.speechService.speak(`${product.name} added to ${meal}.`);
  }

  async removeEntry(entryId: string): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('Please log in to modify your food diary.');
      return;
    }

    const { error } = await supabase
      .from('food_diary_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('Error removing food diary entry from Supabase:', error);
      this.notificationService.showError('Failed to remove item from food diary.');
      return;
    }

    await this.loadData();
    this.notificationService.showInfo('Item removed from your diary.');
  }

  getEntriesForDate(date: string): DiaryEntry[] {
    return this.diary.get(date) || [];
  }

  public getDiarySnapshot(): Map<string, DiaryEntry[]> {
    return new Map(this.diary);
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

  getDailyPerformanceVerdict(date: string, preferences: UserPreferences): DailyVerdict {
    const summary = this.getDailySummary(date);
    const { totalCalories, totalFlaggedItems } = summary;

    let score = 0;

    if (preferences.dailyCalorieTarget) {
      const calorieTarget = preferences.dailyCalorieTarget;
      if (totalCalories <= calorieTarget) {
        score += 2;
      } else if (totalCalories <= calorieTarget * 1.1) {
        score += 1;
      } else {
        score -= 1;
      }
    } else if (preferences.maxCalories) {
      const calorieTarget = preferences.maxCalories * 3;
      if (totalCalories <= calorieTarget) {
        score += 2;
      } else if (totalCalories <= calorieTarget * 1.2) {
        score += 1;
      } else {
        score -= 1;
      }
    }

    if (totalFlaggedItems === 0) {
      score += 3;
    } else if (totalFlaggedItems <= 2) {
      score += 1;
    } else {
      score -= 2;
    }

    if (preferences.goal === 'strictlyNatural' && totalFlaggedItems > 0) {
      score -= 1;
    }
    if (preferences.goal === 'calorieCount' && preferences.dailyCalorieTarget && totalCalories > preferences.dailyCalorieTarget) {
      score -= 1;
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

  getHistoricalDataSummary(days: number): HistoricalDataSummary {
    const labels: string[] = [];
    const calorieData: number[] = [];
    const flaggedIngredientCounts: { [key: string]: number } = {};
    const mealCalories: { [key in MealType]: { total: number, count: number } } = {
      'Breakfast': { total: 0, count: 0 },
      'Lunch': { total: 0, count: 0 },
      'Dinner': { total: 0, count: 0 },
      'Snack': { total: 0, count: 0 },
      'Drinks': { total: 0, count: 0 }
    };

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      labels.push(dateString);

      const summary = this.getDailySummary(dateString);
      calorieData.push(summary.totalCalories);

      for (const [ingredient, count] of Object.entries(summary.flaggedIngredients)) {
        flaggedIngredientCounts[ingredient] = (flaggedIngredientCounts[ingredient] || 0) + count;
      }

      const entries = this.getEntriesForDate(dateString);
      entries.forEach(entry => {
        if (entry.product.calories) {
          mealCalories[entry.meal].total += entry.product.calories;
          mealCalories[entry.meal].count++;
        }
      });
    }

    const averageCaloriesByMeal = Object.entries(mealCalories).reduce((acc, [meal, data]) => {
      acc[meal as MealType] = data.count > 0 ? Math.round(data.total / data.count) : 0;
      return acc;
    }, {} as { [key in MealType]: number });

    return { labels, calorieData, flaggedIngredientCounts, averageCaloriesByMeal };
  }

  private async loadFromSupabase(): Promise<void> {
    if (!this.currentUserId) return;

    const { data, error } = await supabase
      .from('food_diary_entries')
      .select('id, entry_date, meal_type, product_data')
      .eq('user_id', this.currentUserId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading food diary entries from Supabase:', error);
      this.diary = new Map();
      this.diarySubject.next(new Map());
      return;
    }

    const loadedDiary = new Map<string, DiaryEntry[]>();
    data.forEach((item: any) => {
      const entry: DiaryEntry = {
        id: item.id,
        date: item.entry_date,
        meal: item.meal_type,
        product: {
          ...item.product_data,
          scanDate: new Date(item.product_data.scanDate)
        }
      };
      if (!loadedDiary.has(entry.date)) {
        loadedDiary.set(entry.date, []);
      }
      loadedDiary.get(entry.date)?.push(entry);
    });

    this.diary = loadedDiary;
    this.diarySubject.next(new Map(this.diary));
  }
}