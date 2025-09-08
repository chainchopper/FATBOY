import { Injectable } from '@angular/core';
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

  async loadPreferences(): Promise<void> {
    if (this.currentUserId) {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences_data')
        .eq('user_id', this.currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error loading preferences from Supabase:', error);
        this.preferencesSubject.next(this.defaultPreferences);
        return;
      }

      if (data) {
        this.preferencesSubject.next({ ...this.defaultPreferences, ...data.preferences_data });
      } else {
        // No preferences found in Supabase, save the default ones for the new user
        this.preferencesSubject.next(this.defaultPreferences);
        await this.savePreferencesToSupabase(this.defaultPreferences);
      }
    } else {
      // Not logged in, use default preferences
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
    } else {
      console.warn('Cannot save preferences: User not authenticated.');
    }
  }

  public addCustomAvoidedIngredient(ingredient: string): void {
    const prefs = this.getPreferences();
    const lowerIngredient = ingredient.trim().toLowerCase();
    if (lowerIngredient && !prefs.customAvoidedIngredients.includes(lowerIngredient)) {
      prefs.customAvoidedIngredients.push(lowerIngredient);
      this.savePreferences(prefs);
    }
  }

  public removeAvoidedIngredient(ingredient: string): void {
    const prefs = this.getPreferences();
    const lowerIngredient = ingredient.trim().toLowerCase();
    
    let index = prefs.avoidedIngredients.indexOf(lowerIngredient);
    if (index > -1) {
      prefs.avoidedIngredients.splice(index, 1);
    }

    index = prefs.customAvoidedIngredients.indexOf(lowerIngredient);
    if (index > -1) {
      prefs.customAvoidedIngredients.splice(index, 1);
    }
    
    this.savePreferences(prefs);
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
    }
  }
}