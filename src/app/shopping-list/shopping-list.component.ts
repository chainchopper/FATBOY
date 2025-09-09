import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingListService, ShoppingListItem } from '../services/shopping-list.service';
import { AppModalService } from '../services/app-modal.service';
import { Observable } from 'rxjs';
import { ProductCardComponent } from '../product-card/product-card.component';
import { Product, ProductDbService } from '../services/product-db.service';
import { ShareService } from '../services/share.service';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.css']
})
export class ShoppingListComponent implements OnInit {
  shoppingList$!: Observable<ShoppingListItem[]>;

  constructor(
    private shoppingListService: ShoppingListService,
    private appModalService: AppModalService,
    private productDb: ProductDbService,
    private shareService: ShareService
  ) {}

  ngOnInit() {
    this.shoppingList$ = this.shoppingListService.list$;
  }

  onTogglePurchased(itemId: string) {
    this.shoppingListService.toggleItemPurchased(itemId);
  }

  onRemoveItem(itemId: string) {
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

  onShareProduct(product: Product) {
    this.shareService.shareProduct(product);
  }

  onAddToFoodDiary(product: Product) {
    this.appModalService.open(product);
  }

  isFavorite(productId: string): boolean {
    return this.productDb.isFavorite(productId);
  }

  toggleFavorite(productId: string) {
    this.productDb.toggleFavorite(productId);
  }
}