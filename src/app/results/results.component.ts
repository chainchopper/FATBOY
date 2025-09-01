import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { AudioService } from '../services/audio.service';
import { NotificationService } from '../services/notification.service';
import { SpeechService } from '../services/speech.service';
import { ScanContextService } from '../services/scan-context.service';
import { FoodDiaryService } from '../services/food-diary.service';
import { ModalService } from '../services/modal.service';

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
  productForModal: Product | null = null;

  constructor(
    private router: Router,
    private ingredientParser: IngredientParserService,
    private productDb: ProductDbService,
    private audioService: AudioService,
    private notificationService: NotificationService,
    private speechService: SpeechService,
    private scanContextService: ScanContextService,
    private foodDiaryService: FoodDiaryService,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    const productData = sessionStorage.getItem('scannedProduct');
    if (productData) {
      this.product = JSON.parse(productData);
      this.evaluateProduct();
      this.addToHistory();
      this.checkScanContext();
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
    this.productForModal = saved; // Store the full product object for the modal
  }

  private checkScanContext() {
    const mealType = this.scanContextService.getMealType();
    if (mealType && this.productForModal) {
      this.foodDiaryService.addEntry(this.productForModal, mealType);
      this.scanContextService.clearContext();
    }
  }

  addToList() {
    if (this.productForModal) {
      this.modalService.open(this.productForModal);
    } else {
      this.notificationService.showError('Product data not available to add to a list.');
    }
  }

  scanAgain() {
    this.router.navigate(['/scanner']);
  }
}