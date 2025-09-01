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
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit {
  product: Product | null = null; // Changed type to Product | null
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
    private modalService: ModalService,
    private preferencesService: PreferencesService
  ) {}

  ngOnInit() {
    const productData = sessionStorage.getItem('scannedProduct');
    if (productData) {
      this.product = JSON.parse(productData) as Product; // Cast to Product
      this.verdict = this.product.verdict;
      this.flaggedItems = this.product.flaggedIngredients.map(ing => ({ ingredient: ing, reason: `Contains ${ing}, which you avoid.` })); // Reconstruct for display
      this.productForModal = this.product; // Already a full product

      if (this.verdict === 'good') {
        this.audioService.playSuccessSound();
        this.speechService.speak('Fat Boy Approved!');
      } else {
        this.audioService.playErrorSound();
        this.speechService.speak('Contains Items You Avoid');
      }
      this.checkScanContext();
    } else {
      this.router.navigate(['/scanner']);
    }
  }

  // evaluateProduct() and addToHistory() are no longer needed here as they are handled in the scanner.

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