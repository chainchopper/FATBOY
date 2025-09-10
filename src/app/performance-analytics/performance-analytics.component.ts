import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { FoodDiaryService, HistoricalDataSummary } from '../services/food-diary.service';
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-performance-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './performance-analytics.component.html',
  styleUrls: []
})
export class PerformanceAnalyticsComponent implements OnInit {
  public weeklyCaloriesChartData: ChartConfiguration['data'] | null = null;
  public weeklyCaloriesChartOptions: ChartOptions = {};
  public weeklyCaloriesChartType: ChartType = 'line';

  public flaggedIngredientsChartData: ChartConfiguration['data'] | null = null;
  public flaggedIngredientsChartOptions: ChartOptions = {};
  public flaggedIngredientsChartType: ChartType = 'doughnut';

  public mealCaloriesChartData: ChartConfiguration['data'] | null = null;
  public mealCaloriesChartOptions: ChartOptions = {};
  public mealCaloriesChartType: ChartType = 'bar';

  constructor(
    private foodDiaryService: FoodDiaryService,
    private preferencesService: PreferencesService
  ) {}

  ngOnInit() {
    const summary = this.foodDiaryService.getHistoricalDataSummary(7);
    this.setupWeeklyCaloriesChart(summary);
    this.setupFlaggedIngredientsChart(summary);
    this.setupMealCaloriesChart(summary);
  }

  private setupWeeklyCaloriesChart(summary: HistoricalDataSummary) {
    const userPrefs = this.preferencesService.getPreferences();
    this.weeklyCaloriesChartData = {
      labels: summary.labels.map(l => new Date(l).toLocaleDateString('en-US', { weekday: 'short' })),
      datasets: [
        {
          data: summary.calorieData,
          label: 'Daily Calories',
          borderColor: '#f038ff',
          backgroundColor: 'rgba(240, 56, 255, 0.2)',
          fill: true,
          tension: 0.4
        },
        {
          data: Array(7).fill(userPrefs.dailyCalorieTarget),
          label: 'Calorie Target',
          borderColor: '#0abdc6',
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        }
      ]
    };
    this.weeklyCaloriesChartOptions = this.getCommonChartOptions('Weekly Calorie Intake');
  }

  private setupFlaggedIngredientsChart(summary: HistoricalDataSummary) {
    const topIngredients = Object.entries(summary.flaggedIngredientCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (topIngredients.length === 0) return;

    this.flaggedIngredientsChartData = {
      labels: topIngredients.map(([label]) => label),
      datasets: [{
        data: topIngredients.map(([, data]) => data),
        backgroundColor: ['#f038ff', '#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9'],
        hoverBackgroundColor: ['#e81afc', '#9a34f5', '#7a44f4', '#6a22ec', '#5b10d7'],
        borderColor: '#1a1a2e'
      }]
    };
    this.flaggedIngredientsChartOptions = this.getCommonChartOptions('Top 5 Flagged Ingredients (Last 7 Days)');
  }

  private setupMealCaloriesChart(summary: HistoricalDataSummary) {
    this.mealCaloriesChartData = {
      labels: Object.keys(summary.averageCaloriesByMeal),
      datasets: [{
        data: Object.values(summary.averageCaloriesByMeal),
        label: 'Average Calories',
        backgroundColor: 'rgba(10, 189, 198, 0.6)',
        borderColor: '#0abdc6',
        borderWidth: 1
      }]
    };
    this.mealCaloriesChartOptions = this.getCommonChartOptions('Average Calories by Meal Type');
  }

  private getCommonChartOptions(title: string): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#e0e0e0' }
        },
        title: {
          display: true,
          text: title,
          color: '#e0e0e0',
          font: { size: 16 }
        }
      },
      scales: {
        x: {
          ticks: { color: '#a0a0c0' },
          grid: { color: 'rgba(160, 160, 192, 0.2)' }
        },
        y: {
          ticks: { color: '#a0a0c0' },
          grid: { color: 'rgba(160, 160, 192, 0.2)' }
        }
      }
    };
  }
}