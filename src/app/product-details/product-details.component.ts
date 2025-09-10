import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Product, ProductDbService } from '../services/product-db.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { PreferencesService } from '../services/preferences.service';
import { NotificationService } from '../services/notification.service';
import { ShareService } from '../services/share.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { AppModalService } from '../services/app-modal.service';
import { ButtonComponent } from '../button.component';
import { CustomTitleCasePipe } from '../shared/custom-title-case.pipe';
import { firstValueFrom } from 'rxjs';
import { SpeechService } from '../services/speech.service';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonComponent, CustomTitleCasePipe],
  templateUrl: './product-details.component.html',
  styleUrls: []
})
export class ProductDetailsComponent implements OnInit {
  product: Product | null = null;
  verdict: 'good' | 'bad' = 'bad';
  flaggedItems: { ingredient: string, reason: string }[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productDbService: ProductDbService,
    private ingredientParser: IngredientParserService,
    private preferencesService: PreferencesService,
    private notificationService: NotificationService,
    private shareService: ShareService,
    private shoppingListService: ShoppingListService,
    private appModalService: AppModalService,
    private speechService: SpeechService
  ) {}

  async ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      // Try to get from last viewed first for immediate display
      const lastViewed = this.productDbService.getLastViewedProduct();
      if (lastViewed && lastViewed.id === productId) {
        this.product = lastViewed;
      } else {
        // Fallback to fetching from DB if not last viewed
        this.product = await this.productDbService.getProductByClientSideId(productId);
      }

      if (this.product) {
        this.evaluateProduct();
      } else {
        this.notificationService.showError('Product not found.', 'Error');
        this.router.navigate(['/history']); // Redirect if product not found
      }
    } else {
      this.router.navigate(['/history']); // Redirect if no ID in route
    }
  }

  private evaluateProduct(): void {
    if (!this.product) return;

    const preferences = this.preferencesService.getPreferences();
    const evaluation = this.ingredientParser.evaluateProduct(this.product.ingredients, this.product.calories, preferences);

    this.verdict = evaluation.verdict;
    this.flaggedItems = evaluation.flaggedIngredients;
  }

  isIngredientFlagged(ingredient: string): boolean {
    return this.flaggedItems.some(fi => fi.ingredient.toLowerCase() === ingredient.toLowerCase());
  }

  addToList() {
    if (this.product) {
      this.appModalService.open(this.product);
    } else {
      this.notificationService.showError('Product data not available to add to a list.');
    }
  }

  shareProduct() {
    if (this.product) {
      this.shareService.shareProduct(this.product);
    } else {
      this.notificationService.showError('No product to share.');
    }
  }

  goBack(): void {
    this.router.navigate(['/history']); // Or a more dynamic back navigation
  }

  scanAgain() {
    this.router.navigate(['/scanner']);
  }

  addComments() {
    this.notificationService.showInfo('Adding comments/details functionality is coming soon!', 'Feature Coming');
    this.speechService.speak('Adding comments or details functionality is coming soon.');
  }
}