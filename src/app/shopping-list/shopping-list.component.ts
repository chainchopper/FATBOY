import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingListService, ShoppingListItem } from '../services/shopping-list.service';
import { AppModalService } from '../services/app-modal.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ShoppingListItemComponent } from '../shopping-list-item/shopping-list-item.component';
import { AiIntegrationService } from '../services/ai-integration.service'; // Import AiIntegrationService

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, ShoppingListItemComponent],
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.css']
})
export class ShoppingListComponent implements OnInit {
  unpurchasedItems$!: Observable<ShoppingListItem[]>;
  purchasedItems$!: Observable<ShoppingListItem[]>;

  constructor(
    private shoppingListService: ShoppingListService,
    private appModalService: AppModalService,
    private aiService: AiIntegrationService // Inject AiIntegrationService
  ) {}

  ngOnInit() {
    const shoppingList$ = this.shoppingListService.list$;

    this.unpurchasedItems$ = shoppingList$.pipe(
      map(list => list.filter(item => !item.purchased))
    );

    this.purchasedItems$ = shoppingList$.pipe(
      map(list => list.filter(item => item.purchased))
    );
  }

  onTogglePurchased(itemId: string) {
    this.shoppingListService.toggleItemPurchased(itemId);
  }

  onRemoveItem(itemId: string) {
    this.shoppingListService.removeItem(itemId);
  }

  onViewDetails(item: ShoppingListItem) { // New method to handle viewDetails event
    if (item.product) {
      this.aiService.setLastDiscussedProduct(item.product);
    }
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
}