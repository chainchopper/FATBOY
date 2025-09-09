import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductDbService, Product } from '../services/product-db.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { AppModalService } from '../services/app-modal.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ShareService } from '../services/share.service';
import { AiIntegrationService } from '../services/ai-integration.service'; // Import AiIntegrationService

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  products: Product[] = [];
  stats: {ingredient: string, count: number}[] = [];
  selectedCategory: string | null = null;
  
  constructor(
    private productDb: ProductDbService,
    private shoppingListService: ShoppingListService,
    private appModalService: AppModalService,
    private shareService: ShareService,
    private aiService: AiIntegrationService // Inject AiIntegrationService
  ) {}

  ngOnInit() {
    this.productDb.products$.subscribe((products: Product[]) => {
      this.products = products;
      this.stats = this.productDb.getFlaggedIngredientsStats();
    });
  }

  filterByCategory(category: string | null) {
    this.selectedCategory = category;
  }

  get filteredProducts(): Product[] {
    if (!this.selectedCategory) {
      return this.products;
    }
    return this.products.filter(product => 
      product.categories.includes(this.selectedCategory as string)
    );
  }

  removeProduct(id: string) {
    this.productDb.removeProduct(id);
  }

  clearHistory() {
    this.appModalService.openConfirmation({
      title: 'Clear Scan History?',
      message: 'Are you sure you want to clear all your scanned product history? This action cannot be undone.',
      confirmText: 'Clear All',
      cancelText: 'Keep History',
      onConfirm: () => {
        this.productDb.clearAll();
      }
    });
  }

  addToShoppingList(product: Product) {
    this.shoppingListService.addItem(product);
  }

  addToFoodDiary(product: Product) {
    this.appModalService.open(product);
  }

  shareProduct(product: Product) {
    this.shareService.shareProduct(product);
  }

  isFavorite(productId: string): boolean {
    return this.productDb.isFavorite(productId);
  }

  toggleFavorite(productId: string) {
    this.productDb.toggleFavorite(productId);
  }

  onViewDetails(product: Product) { // New method to handle viewDetails event
    this.aiService.setLastDiscussedProduct(product);
  }

  getCategoryIcon(category: string): string {
    const icons: {[key: string]: string} = {
      artificialSweeteners: '🧪',
      artificialColors: '🎨',
      preservatives: '🧴',
      hfcs: '🌽',
      msg: '🍜',
      transFats: '🍔',
      natural: '🌿',
      allergens: '⚠️'
    };
    
    return icons[category] || '📋';
  }
}