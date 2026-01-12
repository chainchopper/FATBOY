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
  useOnDeviceTts: boolean; // New: Prefer on-device TTS
  chatterboxVoiceId: string; // Legacy: Chatterbox voice ID
  // Nirvana (Gemini Live API) settings
  nirvanaVoice: string; // Nirvana voice name (e.g., 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede')
  nirvanaLanguage: string; // Language code (e.g., 'en-US', 'es-ES')
  nirvanaEnableAudio: boolean; // Enable audio responses
  nirvanaEnableThinking: boolean; // Enable thinking mode
  nirvanaEnableGrounding: boolean; // Enable Google Search grounding
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
    shareLeaderboardStatus: true,
    useOnDeviceTts: false,
    chatterboxVoiceId: 'KEVIN', // Legacy
    // Nirvana defaults
    nirvanaVoice: 'Puck', // Default Gemini voice
    nirvanaLanguage: 'en-US',
    nirvanaEnableAudio: true,
    nirvanaEnableThinking: false,
    nirvanaEnableGrounding: false
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
      // Logic for loading from Supabase
      const { data, error } = await supabase
        .from('fatboy_user_preferences')
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
      // Not logged in, load from local storage
      const localPrefsString = localStorage.getItem('fatboy_guest_preferences');
      if (localPrefsString) {
        try {
          const localPrefs = JSON.parse(localPrefsString);
          this.preferencesSubject.next({ ...this.defaultPreferences, ...localPrefs });
        } catch (e) {
          console.error('Error parsing local preferences, using defaults:', e);
          this.preferencesSubject.next(this.defaultPreferences);
        }
      } else {
        this.preferencesSubject.next(this.defaultPreferences);
      }
    }
  }

  getPreferences(): UserPreferences {
    return this.preferencesSubject.getValue();
  }

  async savePreferences(prefs: UserPreferences): Promise<void> {
    this.preferencesSubject.next(prefs); // Update observable immediately

    if (this.currentUserId) {
      await this.savePreferencesToSupabase(prefs);
    } else {
      this.savePreferencesLocally(prefs);
      console.log('Preferences saved locally (user not authenticated).');
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
    if (!this.currentUserId) {
      console.warn('savePreferencesToSupabase: currentUserId is null. This should not be called directly if user is not authenticated.');
      return;
    }

    const { error } = await supabase
      .from('fatboy_user_preferences')
      .upsert(
        { user_id: this.currentUserId, preferences_data: prefs },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error saving preferences to Supabase:', error);
    } else {
      console.log('Preferences successfully saved to Supabase.');
    }
  }

  private savePreferencesLocally(prefs: UserPreferences): void {
    try {
      localStorage.setItem('fatboy_guest_preferences', JSON.stringify(prefs));
    } catch (e) {
      console.error('Error saving preferences to local storage:', e);
    }
  }
}