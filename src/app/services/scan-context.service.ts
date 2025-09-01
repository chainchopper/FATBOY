import { Injectable } from '@angular/core';
import { MealType } from './food-diary.service';

@Injectable({
  providedIn: 'root'
})
export class ScanContextService {
  private mealType: MealType | null = null;

  setMealType(meal: MealType) {
    this.mealType = meal;
  }

  getMealType(): MealType | null {
    const meal = this.mealType;
    return meal;
  }

  clearContext() {
    this.mealType = null;
  }
}