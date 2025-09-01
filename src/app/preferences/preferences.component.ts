import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { PreferencesService } from '../services/preferences.service'; // Import PreferencesService

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyValuePipe, TitleCasePipe],
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.css']
})
export class PreferencesComponent implements OnInit {
  preferences: any; // Will be managed by PreferencesService

  ingredientCategories: { [key: string]: { name: string, items: string[] } };
  newCustomIngredient: string = '';
  private currentUserId: string | null = null;

  constructor(
    private notificationService: NotificationService, 
    private authService: AuthService,
    private ingredientParser: IngredientParserService,
    private preferencesService: PreferencesService // Inject PreferencesService
  ) {
    this.ingredientCategories = this.ingredientParser.INGREDIENT_DATABASE;
    this.preferences = this.preferencesService.getPreferences(); // Initialize with current preferences
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.preferences = this.preferencesService.getPreferences(); // Load preferences for current user
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
    this.preferencesService.savePreferences(this.preferences);
    this.notificationService.showSuccess('Preferences saved!');
  }
}