import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductDbService, Product } from '../services/product-db.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { FoodDiaryService, DiaryEntry } from '../services/food-diary.service';
import { ShoppingListService, ShoppingListItem } from '../services/shopping-list.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

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
  selectedTab: 'scans' | 'diary' | 'shopping' = 'scans';

  diaryEntries$!: Observable<DiaryEntry[]>;
  shoppingListItems$!: Observable<ShoppingListItem[]>;

  constructor(
    private productDb: ProductDbService,
    private ingredientParser: IngredientParserService,
    private router: Router,
    private foodDiaryService: FoodDiaryService,
    private shoppingListService: ShoppingListService
  ) {}

  ngOnInit() {
    this.productDb.products$.subscribe((products: Product[]) => {
      this.products = products;
      this.stats = this.productDb.getFlaggedIngredientsStats();
    });

    this.diaryEntries$ = this.foodDiaryService.diary$.pipe(
      map(diaryMap => {
        const allEntries: DiaryEntry[] = [];
        diaryMap.forEach(entries => allEntries.push(...entries));
        return allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      })
    );

    this.shoppingListItems$ = this.shoppingListService.list$;
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

  selectTab(tab: 'scans' | 'diary' | 'shopping') {
    this.selectedTab = tab;
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

  addToShoppingList(product: Product) {
    this.shoppingListService.addItem(product);
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