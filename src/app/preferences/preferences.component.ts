import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { PreferencesService, UserPreferences } from '../services/preferences.service';
import { GamificationService } from '../services/gamification.service';
import { ButtonComponent } from '../button.component';
import { ChatterboxTtsService, ChatterboxVoice } from '../services/chatterbox-tts.service'; // Import TTS service

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyValuePipe, TitleCasePipe, ButtonComponent],
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.css']
})
export class PreferencesComponent implements OnInit {
  preferences!: UserPreferences; // Use definite assignment assertion
  ingredientCategories: { [key: string]: { name: string, items: string[] } };
  newCustomIngredient: string = '';
  availableTtsVoices: ChatterboxVoice[] = [];
  private currentUserId: string | null = null;

  constructor(
    private notificationService: NotificationService, 
    private authService: AuthService,
    private ingredientParser: IngredientParserService,
    private preferencesService: PreferencesService,
    private gamificationService: GamificationService,
    private chatterboxTtsService: ChatterboxTtsService // Inject ChatterboxTtsService
  ) {
    this.ingredientCategories = this.ingredientParser.INGREDIENT_DATABASE;
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.preferencesService.preferences$.subscribe(prefs => {
        this.preferences = { ...prefs }; // Create a copy to avoid direct mutation
      });
      this.loadTtsVoices(); // Load voices when component initializes and user is known
    });
  }

  async loadTtsVoices(): Promise<void> {
    this.availableTtsVoices = this.chatterboxTtsService.getAvailableVoices();
    // Ensure the selected voice is still valid, or set a default
    if (!this.availableTtsVoices.some(v => v.id === this.preferences.chatterboxVoiceId)) {
      this.preferences.chatterboxVoiceId = 'KEVIN'; // Fallback to KEVIN if selected voice is not found
    }
  }

  onIngredientSelected(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const ingredient = selectElement.value;
    if (ingredient) {
      this.addAvoidedIngredient(ingredient);
      selectElement.value = '';
    }
  }

  getAvoidedIngredientsForCategory(categoryKey: string): string[] {
    const categoryItems = this.ingredientCategories[categoryKey].items;
    return this.preferences.avoidedIngredients.filter((item: string) => categoryItems.includes(item));
  }

  addAvoidedIngredient(ingredient: string): void {
    if (ingredient && !this.preferences.avoidedIngredients.includes(ingredient)) {
      this.preferences.avoidedIngredients.push(ingredient);
    }
  }

  removeAvoidedIngredient(ingredient: string): void {
    const index = this.preferences.avoidedIngredients.indexOf(ingredient);
    if (index > -1) {
      this.preferences.avoidedIngredients.splice(index, 1);
    }
  }

  addCustomIngredient(): void {
    const ingredient = this.newCustomIngredient.trim().toLowerCase();
    if (ingredient && !this.preferences.customAvoidedIngredients.includes(ingredient)) {
      this.preferences.customAvoidedIngredients.push(ingredient);
      
      const category = this.ingredientParser.categorizeSingleIngredient(ingredient);
      if (category) {
        this.addAvoidedIngredient(ingredient);
        this.notificationService.showInfo(`Added "${ingredient}" and auto-categorized it.`);
      }
      
      this.newCustomIngredient = '';
    }
  }

  removeCustomIngredient(index: number): void {
    this.preferences.customAvoidedIngredients.splice(index, 1);
  }

  savePreferences() {
    this.preferencesService.savePreferences(this.preferences);
    this.notificationService.showSuccess('Preferences saved!');
    this.gamificationService.checkAndUnlockAchievements();
  }
}