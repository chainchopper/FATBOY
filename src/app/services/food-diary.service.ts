import { Injectable, isDevMode } from '@angular/core'; // Import isDevMode
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
      this.loadData(); // Use a unified load method
    });
  }

  private getStorageKey(): string {
    return this.currentUserId ? `fatBoyFoodDiary_${this.currentUserId}` : 'fatBoyFoodDiary_anonymous_dev';
  }

  private async loadData(): Promise<void> {
    if (this.currentUserId) {
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      this.loadFromSessionStorage(); // Load from session storage in dev mode if not logged in
    } else {
      this.diary = new Map();
      this.diarySubject.next(new Map());
    }
  }

  async addEntry(product: Product, meal: MealType): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const newEntry: Omit<DiaryEntry, 'id'> = {
      date: today,
      meal,
      product
    };

    if (this.currentUserId) {
      const { data, error } = await supabase
        .from('food_diary_entries')
        .insert({
          user_id: this.currentUserId,
          entry_date: newEntry.date,
          meal_type: newEntry.meal,
          product_data: newEntry.product
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding food diary entry to Supabase:', error);
        this.notificationService.showError('Failed to add item to food diary.');
        this.speechService.speak('Failed to add item to food diary.');
        throw error;
      }
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      const entries = this.diary.get(today) || [];
      entries.push({ ...newEntry, id: `${today}-${Date.now()}` }); // Generate ID for session storage
      this.diary.set(today, entries);
      this.saveToSessionStorage();
      this.diarySubject.next(new Map(this.diary));
    } else {
      console.warn('Cannot add food diary entry: User not authenticated in production mode.');
      this.notificationService.showError('Please log in to add items to your food diary.');
      this.speechService.speak('Please log in to add items to your food diary.');
      return;
    }
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

  private loadFromSessionStorage(): void {
    const stored = sessionStorage.getItem(this.getStorageKey());
    if (stored) {
      this.diary = new Map(JSON.parse(stored).map(([date, entries]: [string, any[]]) => 
        [date, entries.map(entry => ({ ...entry, product: { ...entry.product, scanDate: new Date(entry.product.scanDate) } }))]
      ));
      this.diarySubject.next(new Map(this.diary));
    } else {
      this.diary = new Map();
      this.diarySubject.next(new Map());
    }
  }

  private saveToSessionStorage(): void {
    sessionStorage.setItem(this.getStorageKey(), JSON.stringify(Array.from(this.diary.entries())));
  }
}