import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FoodDiaryService, DiaryEntry, MealType } from '../services/food-diary.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-food-diary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './food-diary.component.html',
  styleUrls: ['./food-diary.component.css']
})
export class FoodDiaryComponent implements OnInit {
  todayEntries$!: Observable<DiaryEntry[]>;
  
  breakfast$!: Observable<DiaryEntry[]>;
  lunch$!: Observable<DiaryEntry[]>;
  dinner$!: Observable<DiaryEntry[]>;
  snacks$!: Observable<DiaryEntry[]>;

  constructor(private foodDiaryService: FoodDiaryService) {}

  ngOnInit() {
    const today = new Date().toISOString().split('T')[0];
    this.todayEntries$ = this.foodDiaryService.diary$.pipe(
      map(diary => diary.get(today) || [])
    );

    this.breakfast$ = this.filterEntriesByMeal('Breakfast');
    this.lunch$ = this.filterEntriesByMeal('Lunch');
    this.dinner$ = this.filterEntriesByMeal('Dinner');
    this.snacks$ = this.filterEntriesByMeal('Snack');
  }

  private filterEntriesByMeal(meal: MealType): Observable<DiaryEntry[]> {
    return this.todayEntries$.pipe(
      map(entries => entries.filter(entry => entry.meal === meal))
    );
  }
}