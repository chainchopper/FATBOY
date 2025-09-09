import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingListService, ShoppingListItem } from '../services/shopping-list.service';
import { AppModalService } from '../services/app-modal.service';
import { Observable } from 'rxjs';
import { ProductCardComponent } from '../product-card/product-card.component'; // Import ProductCardComponent
import { Product } from '../services/product-db.service'; // Import Product for event emitters

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, ProductCardComponent], // Add ProductCardComponent to imports
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.css']
})
export class ShoppingListComponent implements OnInit {
  shoppingList$!: Observable<ShoppingListItem[]>;

  constructor(
    private shoppingListService: ShoppingListService,
    private appModalService: AppModalService
  ) {}

  ngOnInit() {
    this.shoppingList$ = this.shoppingListService.list$;
  }

  toggleItem(itemId: string) {
    this.shoppingListService.toggleItemPurchased(itemId);
  }

  removeItem(itemId: string) {
    this.shoppingListService.removeItem(itemId);
  }

  clearList() {
    this.appModalService.openConfirmation({
      title: 'Clear Shopping List?',
      message: 'Are you sure you want to clear your entire shopping list? This action cannot be undone.',
      confirmText: 'Clear All',
      cancelText: 'Keep List',
      onConfirm: () => {
        this.shoppingListService.clearList();
      }
    });
  }

  // Event handlers for ProductCardComponent
  onTogglePurchased(itemId: string) {
    this.toggleItem(itemId);
  }

  onRemoveItem(itemId: string) {
    this.removeItem(itemId);
  }

  onShareProduct(product: Product) {
    // Implement share logic here, or pass to a ShareService
    console.log('Share product:', product);
  }

  onAddToFoodDiary(product: Product) {
    // Implement add to food diary logic here
    console.log('Add to food diary:', product);
  }
}