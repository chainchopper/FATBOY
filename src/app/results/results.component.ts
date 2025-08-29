import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { AudioService } from '../services/audio.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { NotificationService } from '../services/notification.service';
import { FoodDiaryService } from '../services/food-diary.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit {
  product: any;
  verdict: 'good' | 'bad' = 'bad';
  flaggedItems: { ingredient: string, reason: string }[] = [];

  constructor(
    private router: Router,
    private ingredientParser: IngredientParserService,
    private productDb: ProductDbService,
    private audioService: AudioService,
    private shoppingListService: ShoppingListService,
    private notificationService: NotificationService,
    private foodDiaryService: FoodDiaryService
  ) {}

  ngOnInit() {
    // ... ngOnInit logic ...
  }

  evaluateProduct() {
    // ... evaluateProduct logic ...
  }

  private addToHistory(): void {
    // ... addToHistory logic ...
  }

  saveProduct() {
    // ... saveProduct logic ...
  }

  addToShoppingList() {
    // ... addToShoppingList logic ...
  }

  addToDiary() {
    const productFromHistory = this.productDb.getProductById(JSON.parse(sessionStorage.getItem('viewingProduct') || '{}').id);
    if (productFromHistory) {
      // For now, defaults to 'Snack'. A future version could ask the user.
      this.foodDiaryService.addEntry(productFromHistory, 'Snack');
    }
  }

  scanAgain() {
    this.router.navigate(['/scanner']);
  }
}