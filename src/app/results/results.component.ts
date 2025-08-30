import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { AudioService } from '../services/audio.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { NotificationService } from '../services/notification.service';
import { FoodDiaryService } from '../services/food-diary.service';
import { SpeechService } from '../services/speech.service';

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
    private foodDiaryService: FoodDiaryService,
    private speechService: SpeechService
  ) {}

  ngOnInit() {
    const productData = sessionStorage.getItem('scannedProduct');
    if (productData) {
      this.product = JSON.parse(productData);
      this.evaluateProduct();
      this.addToHistory();
    } else {
      this.router.navigate(['/scanner']);
    }
  }

  evaluateProduct() {
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');
    const ingredients = Array.isArray(this.product.ingredients) ? this.product.ingredients : [];
    
    const evaluation = this.ingredientParser.evaluateProduct(ingredients, this.product.calories, preferences);
    
    this.verdict = evaluation.verdict;
    this.flaggedItems = evaluation.flaggedIngredients;

    if (this.verdict === 'good') {
      this.audioService.playSuccessSound();
      this.speechService.speak('Fat Boy Approved!');
    } else {
      this.audioService.playErrorSound();
      this.speechService.speak('Contains Items You Avoid');
    }
  }

  private addToHistory(): void {
    if (!this.product) return;

    const categories = this.ingredientParser.categorizeProduct(
      Array.isArray(this.product.ingredients) ? this.product.ingredients : []
    );

    const productInfo: Omit<Product, 'id' | 'scanDate'> = {
      name: this.product.name || 'Unknown Product',
      brand: this.product.brand || 'Unknown Brand',
      barcode: this.product.barcode,
      ingredients: Array.isArray(this.product.ingredients) ? this.product.ingredients : [],
      calories: this.product.calories,
      image: this.product.image,
      categories,
      verdict: this.verdict,
      flaggedIngredients: this.flaggedItems.map(f => f.ingredient)
    };

    const saved = this.productDb.addProduct(productInfo);
    sessionStorage.setItem('viewingProduct', JSON.stringify(saved));
  }

  saveProduct() {
    this.notificationService.showSuccess(`${this.product.name} saved to your gallery!`);
  }

  addToShoppingList() {
    const productFromHistory = this.productDb.getProductById(JSON.parse(sessionStorage.getItem('viewingProduct') || '{}').id);
    if (productFromHistory) {
      this.shoppingListService.addItem(productFromHistory);
    }
  }

  addToDiary() {
    const productFromHistory = this.productDb.getProductById(JSON.parse(sessionStorage.getItem('viewingProduct') || '{}').id);
    if (productFromHistory) {
      // For now, defaults to 'Snack'. A future version could ask the user.
      this.foodDiaryService.addEntry(productFromHistory, 'Snack');
    }
  }

  addToAvoidList() {
    if (!this.product) return;
    const productInfo: Omit<Product, 'id' | 'scanDate'> = {
      name: this.product.name || 'Unknown Product',
      brand: this.product.brand || 'Unknown Brand',
      barcode: this.product.barcode,
      ingredients: Array.isArray(this.product.ingredients) ? this.product.ingredients : [],
      calories: this.product.calories,
      image: this.product.image,
      categories: this.ingredientParser.categorizeProduct(Array.isArray(this.product.ingredients) ? this.product.ingredients : []),
      verdict: 'bad',
      flaggedIngredients: this.flaggedItems.map(f => f.ingredient)
    };
    this.productDb.addAvoidedProduct(productInfo);
    this.notificationService.showInfo(`${this.product.name} added to your avoid list.`, 'Avoided!');
    this.speechService.speak(`${this.product.name} added to your avoid list.`);
  }

  scanAgain() {
    this.router.navigate(['/scanner']);
  }
}