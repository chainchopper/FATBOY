import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { IngredientParserService } from '../services/ingredient-parser.service';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyValuePipe, TitleCasePipe],
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.css']
})
export class PreferencesComponent implements OnInit {
  preferences = {
    avoidedIngredients: ['aspartame', 'sucralose', 'red 40', 'yellow 5', 'high-fructose corn syrup', 'partially hydrogenated'],
    customAvoidedIngredients: [] as string[],
    maxCalories: 200,
    dailyCalorieTarget: 2000,
    goal: 'avoidChemicals',
    shareUsername: true,
    shareGoal: true,
    shareLeaderboardStatus: true
  };

  ingredientCategories: { [key: string]: { name: string, items: string[] } };
  newCustomIngredient: string = '';
  private currentUserId: string | null = null;

  constructor(
    private notificationService: NotificationService, 
    private authService: AuthService,
    private ingredientParser: IngredientParserService
  ) {
    this.ingredientCategories = this.ingredientParser.INGREDIENT_DATABASE;
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadPreferences();
    });
  }

  isIngredientAvoided(ingredient: string): boolean {
    return this.preferences.avoidedIngredients.includes(ingredient);
  }

  toggleAvoidIngredient(ingredient: string): void {
    const index = this.preferences.avoidedIngredients.indexOf(ingredient);
    if (index > -1) {
      this.preferences.avoidedIngredients.splice(index, 1);
    } else {
      this.preferences.avoidedIngredients.push(ingredient);
    }
  }

  addCustomIngredient(): void {
    const ingredient = this.newCustomIngredient.trim().toLowerCase();
    if (ingredient && !this.preferences.customAvoidedIngredients.includes(ingredient)) {
      this.preferences.customAvoidedIngredients.push(ingredient);
      this.newCustomIngredient = '';
    }
  }

  removeCustomIngredient(index: number): void {
    this.preferences.customAvoidedIngredients.splice(index, 1);
  }

  savePreferences() {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.preferences));
    this.notificationService.showSuccess('Preferences saved!');
  }

  private getStorageKey(): string {
    return this.currentUserId ? `fatBoyPreferences_${this.currentUserId}` : 'fatBoyPreferences_anonymous';
  }

  private loadPreferences() {
    const saved = localStorage.getItem(this.getStorageKey());
    if (saved) {
      const savedPrefs = JSON.parse(saved);
      // Ensure customAvoidedIngredients is an array, even if loading old data
      savedPrefs.customAvoidedIngredients = savedPrefs.customAvoidedIngredients || [];
      this.preferences = { ...this.preferences, ...savedPrefs };
    }
  }
}