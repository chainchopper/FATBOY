import { Injectable, isDevMode } from '@angular/core'; // Import isDevMode
import { AuthService } from './auth.service';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../../integrations/supabase/client';

export interface UserPreferences {
  avoidedIngredients: string[];
  customAvoidedIngredients: string[];
  maxCalories: number;
  dailyCalorieTarget: number;
  goal: 'strictlyNatural' | 'avoidChemicals' | 'calorieCount';
  onDeviceInference: boolean;
  enableVoiceCommands: boolean;
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
    enableVoiceCommands: false,
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
    return this.currentUserId ? `fatBoyPreferences_${this.currentUserId}` : 'fatBoyPreferences_anonymous_dev';
  }

  async loadPreferences(): Promise<void> {
    if (this.currentUserId) {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences_data')
        .eq('user_id', this.currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences from Supabase:', error);
        // Fallback to session storage or default if Supabase fails
        if (isDevMode()) {
          this.loadFromSessionStorage();
        } else {
          this.preferencesSubject.next(this.defaultPreferences);
        }
        return;
      }

      if (data) {
        this.preferencesSubject.next({ ...this.defaultPreferences, ...data.preferences_data });
      } else {
        // No preferences found in Supabase, try session storage or use defaults
        if (isDevMode()) {
          const stored = sessionStorage.getItem(this.getStorageKey());
          if (stored) {
            const loadedPrefs = { ...this.defaultPreferences, ...JSON.parse(stored) };
            this.preferencesSubject.next(loadedPrefs);
            await this.savePreferencesToSupabase(loadedPrefs); // Migrate to Supabase
          } else {
            this.preferencesSubject.next(this.defaultPreferences);
            await this.savePreferencesToSupabase(this.defaultPreferences); // Save default to Supabase
          }
        } else {
          this.preferencesSubject.next(this.defaultPreferences);
          await this.savePreferencesToSupabase(this.defaultPreferences); // Save default to Supabase
        }
      }
    } else if (isDevMode()) {
      // Not logged in, use session storage for dev mode
      this.loadFromSessionStorage();
    } else {
      this.preferencesSubject.next(this.defaultPreferences);
    }
  }

  getPreferences(): UserPreferences {
    return this.preferencesSubject.getValue();
  }

  async savePreferences(prefs: UserPreferences): Promise<void> {
    this.preferencesSubject.next(prefs);
    if (this.currentUserId) {
      await this.savePreferencesToSupabase(prefs);
    } else if (isDevMode()) {
      sessionStorage.setItem(this.getStorageKey(), JSON.stringify(prefs));
    } else {
      console.warn('Cannot save preferences: User not authenticated in production mode.');
    }
  }

  private async savePreferencesToSupabase(prefs: UserPreferences): Promise<void> {
    if (!this.currentUserId) return;

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: this.currentUserId, preferences_data: prefs },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error saving preferences to Supabase:', error);
    } else {
      // Clear session storage for authenticated user to avoid conflicts
      sessionStorage.removeItem(this.getStorageKey());
    }
  }

  private loadFromSessionStorage(): void {
    const stored = sessionStorage.getItem(this.getStorageKey());
    if (stored) {
      this.preferencesSubject.next({ ...this.defaultPreferences, ...JSON.parse(stored) });
    } else {
      this.preferencesSubject.next(this.defaultPreferences);
    }
  }
}