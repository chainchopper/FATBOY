import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductDbService, Product } from '../services/product-db.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { AppModalService } from '../services/app-modal.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ShareService } from '../services/share.service';
import { AiIntegrationService } from '../services/ai-integration.service';
import { ButtonComponent } from '../button/button.component';
import { CustomTitleCasePipe } from '../shared/custom-title-case.pipe';
import { SemanticSearchService } from '../services/semantic-search.service';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../input/input.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, ButtonComponent, CustomTitleCasePipe, FormsModule, InputComponent],
  templateUrl: './history.component.html',
  styleUrls: []
})
export class HistoryComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  stats: {ingredient: string, count: number}[] = [];
  selectedCategory: string | null = null;
  searchQuery: string = '';
  isSearching: boolean = false;
  
  constructor(
    private productDb: ProductDbService,
    private shoppingListService: ShoppingListService,
    private appModalService: AppModalService,
    private shareService: ShareService,
    private aiService: AiIntegrationService,
    private router: Router,
    private semanticSearchService: SemanticSearchService
  ) {}

  ngOnInit() {
    this.productDb.products$.subscribe((products: Product[]) => {
      this.products = products;
      this.filteredProducts = products; // Initially show all products
      this.stats = this.productDb.getFlaggedIngredientsStats();
    });
  }

  async performSearch() {
    this.isSearching = true;
    this.selectedCategory = null; // Reset category filter when searching
    this.filteredProducts = await this.semanticSearchService.search(this.searchQuery);
    this.isSearching = false;
  }

  filterByCategory(category: string | null) {
    this.selectedCategory = category;
    this.searchQuery = ''; // Clear search when using category filter
    if (!this.selectedCategory) {
      this.filteredProducts = this.products;
    } else {
      this.filteredProducts = this.products.filter(product => 
        product.categories.includes(this.selectedCategory as string)
      );
    }
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

  onViewDetails(product: Product) {
    this.productDb.setLastViewedProduct(product);
    this.router.navigate(['/products', product.id]);
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