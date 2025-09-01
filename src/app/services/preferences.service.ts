import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { BehaviorSubject } from 'rxjs';

export interface UserPreferences {
  avoidedIngredients: string[];
  customAvoidedIngredients: string[];
  maxCalories: number;
  dailyCalorieTarget: number;
  goal: 'strictlyNatural' | 'avoidChemicals' | 'calorieCount';
  onDeviceInference: boolean;
  enableVoiceCommands: boolean; // New preference
  shareUsername: boolean;
  shareGoal: boolean;
  shareLeaderboardStatus: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  private defaultPreferences: UserPreferences = {
    avoidedIngredients: ['aspartame', 'sucralose', 'red 40', 'yellow 5', 'high-fructose corn syrup', 'partially hydrogenated'],
    customAvoidedIngredients: [],
    maxCalories: 200,
    dailyCalorieTarget: 2000,
    goal: 'avoidChemicals',
    onDeviceInference: false,
    enableVoiceCommands: false, // Default to false
    shareUsername: true,
    shareGoal: true,
    shareLeaderboardStatus: true
  };

  private preferencesSubject = new BehaviorSubject<UserPreferences>(this.defaultPreferences);
  public preferences$ = this.preferencesSubject.asObservable();

  private currentUserId: string | null = null;

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadPreferences();
    });
  }

  private getStorageKey(): string {
    return this.currentUserId ? `fatBoyPreferences_${this.currentUserId}` : 'fatBoyPreferences_anonymous';
  }

  loadPreferences(): void {
    const saved = localStorage.getItem(this.getStorageKey());
    if (saved) {
      const loadedPrefs = JSON.parse(saved);
      // Merge with default preferences to ensure all keys exist, especially new ones
      this.preferencesSubject.next({ ...this.defaultPreferences, ...loadedPrefs });
    } else {
      this.preferencesSubject.next(this.defaultPreferences);
    }
  }

  getPreferences(): UserPreferences {
    return this.preferencesSubject.getValue();
  }

  savePreferences(prefs: UserPreferences): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(prefs));
    this.preferencesSubject.next(prefs); // Update the observable
  }
}