import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Product } from '../services/product-db.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { AudioService } from '../services/audio.service';
import { SpeechService } from '../services/speech.service';
import { NotificationService } from '../services/notification.service';
import { ProductDbService } from '../services/product-db.service';
import { FoodDiaryService } from '../services/food-diary.service';
import { ScanContextService } from '../services/scan-context.service';
import { ModalService } from '../services/modal.service';
import { PreferencesService } from '../services/preferences.service';
import { ButtonComponent } from '../button.component'; // Updated import path

@Component({
  selector: 'app-ocr-results',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './ocr-results.component.html',
  styleUrls: ['./ocr-results.component.css']
})
export class OcrResultsComponent implements OnInit {
  product: Product | null = null;
  verdict: 'good' | 'bad' = 'bad';
  flaggedItems: { ingredient: string, reason: string }[] = [];

  constructor(
    private router: Router,
    private ingredientParser: IngredientParserService,
    private audioService: AudioService,
    private speechService: SpeechService,
    private notificationService: NotificationService,
    private productDb: ProductDbService,
    private foodDiaryService: FoodDiaryService,
    private scanContextService: ScanContextService,
    private modalService: ModalService,
    private preferencesService: PreferencesService
  ) {}

  ngOnInit(): void {
    const productData = sessionStorage.getItem('viewingProduct');
    if (productData) {
      this.product = JSON.parse(productData);
      this.evaluateProduct();
      this.checkScanContext();
    } else {
      this.router.navigate(['/scanner']);
    }
  }

  private evaluateProduct(): void {
    if (!this.product) return;

    const preferences = this.preferencesService.getPreferences();
    const evaluation = this.ingredientParser.evaluateProduct(this.product.ingredients, this.product.calories, preferences);

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

  private checkScanContext() {
    const mealType = this.scanContextService.getMealType();
    if (mealType && this.product) {
      this.foodDiaryService.addEntry(this.product, mealType);
      this.scanContextService.clearContext();
    }
  }

  isIngredientFlagged(ingredient: string): boolean {
    return this.flaggedItems.some(fi => fi.ingredient.toLowerCase() === ingredient.toLowerCase());
  }

  addToList() {
    if (this.product) {
      this.modalService.open(this.product);
    } else {
      this.notificationService.showError('Product data not available to add to a list.');
    }
  }

  scanAgain(): void {
    this.router.navigate(['/scanner']);
  }

  viewRawText(): void {
    if (this.product?.ocrText) {
      this.notificationService.showInfo(this.product.ocrText, 'Raw Text');
      this.speechService.speak('Displaying raw text.');
    } else {
      this.notificationService.showWarning('No raw text available.', 'Info');
      this.speechService.speak('No raw text available.');
    }
  }
}