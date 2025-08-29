import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from './product-db.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  meal: MealType;
  product: Product;
}

@Injectable({
  providedIn: 'root'
})
export class FoodDiaryService {
  private diary = new Map<string, DiaryEntry[]>();
  private diarySubject = new BehaviorSubject<Map<string, DiaryEntry[]>>(this.diary);
  public diary$ = this.diarySubject.asObservable();
  private currentUserId: string | null = null;

  constructor(private notificationService: NotificationService, private authService: AuthService) {
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
  }

  getEntriesForDate(date: string): DiaryEntry[] {
    return this.diary.get(date) || [];
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