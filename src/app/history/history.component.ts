import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductDbService, Product } from '../services/product-db.service';
import { IngredientParserService } from '../services/ingredient-parser.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  products: Product[] = [];
  stats: {ingredient: string, count: number}[] = [];
  selectedCategory: string | null = null;

  constructor(
    private productDb: ProductDbService,
    private ingredientParser: IngredientParserService,
    private router: Router
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

  viewProduct(product: Product) {
    sessionStorage.setItem('viewingProduct', JSON.stringify(product));
    this.router.navigate(['/ocr-results']);
  }

  removeProduct(id: string) {
    this.productDb.removeProduct(id);
  }

  clearHistory() {
    if (confirm('Are you sure you want to clear all scan history?')) {
      this.productDb.clearAll();
    }
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