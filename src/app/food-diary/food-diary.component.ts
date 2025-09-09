import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValuePipe, TitleCasePipe, DatePipe } from '@angular/common';
import { FoodDiaryService, DiaryEntry, MealType, DailyVerdict } from '../services/food-diary.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ScanContextService } from '../services/scan-context.service';
import { Router } from '@angular/router';
import { PreferencesService, UserPreferences } from '../services/preferences.service';
import { Product } from '../services/product-db.service';
import { ShareService } from '../services/share.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { DailySummaryCardComponent } from '../daily-summary-card/daily-summary-card.component';
import { DiaryItemComponent } from '../diary-item/diary-item.component';
import { AiIntegrationService } from '../services/ai-integration.service'; // Import AiIntegrationService

@Component({
  selector: 'app-food-diary',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, TitleCasePipe, DatePipe, DailySummaryCardComponent, DiaryItemComponent],
  templateUrl: './food-diary.component.html',
  styleUrls: ['./food-diary.component.css']
})
export class FoodDiaryComponent implements OnInit {
  todayEntries$!: Observable<DiaryEntry[]>;
  dailySummary: { totalCalories: number; totalFlaggedItems: number; flaggedIngredients: { [key: string]: number } } = {
    totalCalories: 0,
    totalFlaggedItems: 0,
    flaggedIngredients: {}
  };
  dailyVerdict: DailyVerdict = 'fair';
  userPreferences!: UserPreferences;
  
  breakfast$!: Observable<DiaryEntry[]>;
  lunch$!: Observable<DiaryEntry[]>;
  dinner$!: Observable<DiaryEntry[]>;
  snacks$!: Observable<DiaryEntry[]>;
  drinks$!: Observable<DiaryEntry[]>;

  currentDate: Date = new Date(); // Track the currently viewed date

  constructor(
    private foodDiaryService: FoodDiaryService,
    private scanContextService: ScanContextService,
    private router: Router,
    private preferencesService: PreferencesService,
    private shareService: ShareService,
    private shoppingListService: ShoppingListService,
    private aiService: AiIntegrationService // Inject AiIntegrationService
  ) {}

  ngOnInit() {
    this.preferencesService.preferences$.subscribe(prefs => {
      this.userPreferences = prefs;
      this.loadDiaryForDate(this.currentDate); // Reload data if preferences change
    });
  }

  loadDiaryForDate(date: Date): void {
    const dateString = date.toISOString().split('T')[0];
    this.todayEntries$ = this.foodDiaryService.diary$.pipe(
      map(diary => diary.get(dateString) || [])
    );

    this.todayEntries$.subscribe(entries => {
      this.dailySummary = this.foodDiaryService.getDailySummary(dateString);
      this.dailyVerdict = this.foodDiaryService.getDailyPerformanceVerdict(dateString, this.userPreferences);
    });

    this.breakfast$ = this.filterEntriesByMeal('Breakfast');
    this.lunch$ = this.filterEntriesByMeal('Lunch');
    this.dinner$ = this.filterEntriesByMeal('Dinner');
    this.snacks$ = this.filterEntriesByMeal('Snack');
    this.drinks$ = this.filterEntriesByMeal('Drinks');
  }

  private filterEntriesByMeal(meal: MealType): Observable<DiaryEntry[]> {
    return this.todayEntries$.pipe(
      map(entries => entries.filter(entry => entry.meal === meal))
    );
  }

  scanForMeal(meal: MealType) {
    this.scanContextService.setMealType(meal);
    this.router.navigate(['/scanner']);
  }

  goToPreviousDay(): void {
    this.currentDate.setDate(this.currentDate.getDate() - 1);
    this.loadDiaryForDate(this.currentDate);
  }

  goToNextDay(): void {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.loadDiaryForDate(this.currentDate);
  }

  isToday(): boolean {
    const today = new Date();
    return this.currentDate.toDateString() === today.toDateString();
  }

  onRemoveEntry(entryId: string) {
    this.foodDiaryService.removeEntry(entryId);
  }

  onShareProduct(product: Product) {
    this.shareService.shareProduct(product);
  }

  onAddToShoppingList(product: Product) {
    this.shoppingListService.addItem(product);
  }

  onViewDetails(product: Product) { // New method to handle viewDetails event
    this.aiService.setLastDiscussedProduct(product);
  }
}