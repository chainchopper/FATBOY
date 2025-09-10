import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { AudioService } from '../services/audio.service';
import { NotificationService } from '../services/notification.service';
import { SpeechService } from '../services/speech.service';
import { ScanContextService } from '../services/scan-context.service';
import { FoodDiaryService } from '../services/food-diary.service'; // Import FoodDiaryService
import { ModalService } from '../services/modal.service';
import { PreferencesService } from '../services/preferences.service';
import { ButtonComponent } from '../button.component';
import { ShareService } from '../services/share.service'; // Import ShareService
import { CustomTitleCasePipe } from '../shared/custom-title-case.pipe'; // Import CustomTitleCasePipe

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, ButtonComponent, CustomTitleCasePipe], // Add CustomTitleCasePipe
  templateUrl: './results.component.html',
  styleUrls: []
})
export class ResultsComponent implements OnInit {
  product: Product | null = null;
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
    private foodDiaryService: FoodDiaryService, // Inject FoodDiaryService
    private modalService: ModalService,
    private preferencesService: PreferencesService,
    private shareService: ShareService // Inject ShareService
  ) {}

  ngOnInit() {
    const productData = sessionStorage.getItem('scannedProduct');
    if (productData) {
      this.product = JSON.parse(productData) as Product;
      this.verdict = this.product.verdict;
      this.flaggedItems = this.product.flaggedIngredients.map(ing => ({ ingredient: ing, reason: `Contains ${ing}, which you avoid.` }));
      this.productForModal = this.product;

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

  shareProduct() {
    if (this.product) {
      this.shareService.shareProduct(this.product);
    } else {
      this.notificationService.showError('No product to share.');
    }
  }

  addComments() {
    this.notificationService.showInfo('Adding comments/details functionality is coming soon!', 'Feature Coming');
    this.speechService.speak('Adding comments or details functionality is coming soon.');
  }
}