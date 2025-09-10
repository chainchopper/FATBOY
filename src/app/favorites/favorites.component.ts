import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductDbService, Product } from '../services/product-db.service';
import { Observable } from 'rxjs';
import { ShareService } from '../services/share.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ShoppingListService } from '../services/shopping-list.service';
import { AppModalService } from '../services/app-modal.service';
import { AiIntegrationService } from '../services/ai-integration.service'; // Import AiIntegrationService
import { Router } from '@angular/router'; // Import Router

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit {
  favorites$!: Observable<Product[]>;

  constructor(
    private productDb: ProductDbService,
    private shareService: ShareService,
    private shoppingListService: ShoppingListService,
    private appModalService: AppModalService,
    private aiService: AiIntegrationService, // Inject AiIntegrationService
    private router: Router // Inject Router
  ) {}

  ngOnInit() {
    this.favorites$ = this.productDb.favorites$;
  }

  isFavorite(productId: string): boolean {
    return this.productDb.isFavorite(productId);
  }

  toggleFavorite(productId: string) {
    this.productDb.toggleFavorite(productId);
  }

  shareProduct(product: Product) {
    this.shareService.shareProduct(product);
  }

  addToShoppingList(product: Product) {
    this.shoppingListService.addItem(product);
  }

  addToFoodDiary(product: Product) {
    this.appModalService.open(product); // Still use modal for meal type selection
  }

  onViewDetails(product: Product) { // New method to handle viewDetails event
    this.productDb.setLastViewedProduct(product); // Use ProductDbService
    this.router.navigate(['/products', product.id]); // Navigate to details page
  }
}