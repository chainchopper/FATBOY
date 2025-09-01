import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../../integrations/supabase/client'; // Import Supabase client

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
      this.loadPreferences(); // Reload preferences when user changes
    });
  }

  private getStorageKey(): string {
    // Fallback to anonymous local storage if no user is logged in
    return this.currentUserId ? `fatBoyPreferences_${this.currentUserId}` : 'fatBoyPreferences_anonymous';
  }

  async loadPreferences(): Promise<void> {
    if (this.currentUserId) {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences_data')
        .eq('user_id', this.currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means 'no rows found'
        console.error('Error loading preferences from Supabase:', error);
        // Fallback to local storage or default if Supabase fails
        const stored = localStorage.getItem(this.getStorageKey());
        if (stored) {
          this.preferencesSubject.next({ ...this.defaultPreferences, ...JSON.parse(stored) });
        } else {
          this.preferencesSubject.next(this.defaultPreferences);
        }
        return;
      }

      if (data) {
        this.preferencesSubject.next({ ...this.defaultPreferences, ...data.preferences_data });
      } else {
        // No preferences found in Supabase, try local storage or use defaults
        const stored = localStorage.getItem(this.getStorageKey());
        if (stored) {
          const loadedPrefs = { ...this.defaultPreferences, ...JSON.parse(stored) };
          this.preferencesSubject.next(loadedPrefs);
          // Also save to Supabase for future consistency
          await this.savePreferencesToSupabase(loadedPrefs);
        } else {
          this.preferencesSubject.next(this.defaultPreferences);
          // Save default preferences to Supabase
          await this.savePreferencesToSupabase(this.defaultPreferences);
        }
      }
    } else {
      // Not logged in, use local storage
      const stored = localStorage.getItem(this.getStorageKey());
      if (stored) {
        this.preferencesSubject.next({ ...this.defaultPreferences, ...JSON.parse(stored) });
      } else {
        this.preferencesSubject.next(this.defaultPreferences);
      }
    }
  }

  getPreferences(): UserPreferences {
    return this.preferencesSubject.getValue();
  }

  async savePreferences(prefs: UserPreferences): Promise<void> {
    this.preferencesSubject.next(prefs); // Update observable immediately for reactivity
    if (this.currentUserId) {
      await this.savePreferencesToSupabase(prefs);
    } else {
      // Not logged in, save to local storage
      localStorage.setItem(this.getStorageKey(), JSON.stringify(prefs));
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
      // Clear local storage for authenticated user to avoid conflicts
      localStorage.removeItem(this.getStorageKey());
    }
  }
}