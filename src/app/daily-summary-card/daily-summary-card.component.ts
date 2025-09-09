import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { DailyVerdict } from '../services/food-diary.service';
import { UserPreferences } from '../services/preferences.service';

@Component({
  selector: 'app-daily-summary-card',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, KeyValuePipe],
  templateUrl: './daily-summary-card.component.html',
  styleUrls: ['./daily-summary-card.component.css']
})
export class DailySummaryCardComponent implements OnChanges {
  @Input() summary!: { totalCalories: number; totalFlaggedItems: number; flaggedIngredients: { [key: string]: number } };
  @Input() verdict: DailyVerdict = 'fair';
  @Input() preferences!: UserPreferences;

  calorieProgress = 0;
  calorieProgressColor = '#0abdc6'; // Default good color

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['summary'] || changes['preferences']) {
      this.updateCalorieProgress();
    }
  }

  private updateCalorieProgress(): void {
    if (!this.summary || !this.preferences || !this.preferences.dailyCalorieTarget) {
      this.calorieProgress = 0;
      return;
    }

    const progress = (this.summary.totalCalories / this.preferences.dailyCalorieTarget) * 100;
    this.calorieProgress = Math.min(progress, 100); // Cap at 100%

    if (progress > 100) {
      this.calorieProgressColor = '#f038ff'; // Bad color
    } else if (progress > 85) {
      this.calorieProgressColor = '#ffeb3b'; // Warning color
    } else {
      this.calorieProgressColor = '#0abdc6'; // Good color
    }
  }
}