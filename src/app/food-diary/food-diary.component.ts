import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValuePipe, TitleCasePipe, DatePipe } from '@angular/common';
import { FoodDiaryService, DiaryEntry, MealType, DailyVerdict } from '../services/food-diary.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ScanContextService } from '../services/scan-context.service';
import { Router } from '@angular/router';
import { PreferencesService } from '../services/preferences.service'; // Import PreferencesService

@Component({
  selector: 'app-food-diary',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, TitleCasePipe, DatePipe],
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
    private preferencesService: PreferencesService // Inject PreferencesService
  ) {}

  ngOnInit() {
    this.loadDiaryForDate(this.currentDate);
  }

  loadDiaryForDate(date: Date): void {
    const dateString = date.toISOString().split('T')[0];
    this.todayEntries$ = this.foodDiaryService.diary$.pipe(
      map(diary => diary.get(dateString) || [])
    );

    this.todayEntries$.subscribe(entries => {
      this.dailySummary = this.foodDiaryService.getDailySummary(dateString);
      const preferences = this.preferencesService.getPreferences(); // Get preferences from service
      this.dailyVerdict = this.foodDiaryService.getDailyPerformanceVerdict(dateString, preferences);
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
}