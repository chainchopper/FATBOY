import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingListService, ShoppingListItem } from '../services/shopping-list.service';
import { AppModalService } from '../services/app-modal.service'; // Import AppModalService
import { Observable } from 'rxjs';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.css']
})
export class ShoppingListComponent implements OnInit {
  shoppingList$!: Observable<ShoppingListItem[]>;

  constructor(
    private shoppingListService: ShoppingListService,
    private appModalService: AppModalService // Inject AppModalService
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
}