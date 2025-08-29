import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingListService, ShoppingListItem } from '../services/shopping-list.service';
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

  constructor(private shoppingListService: ShoppingListService) {}

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
    if (confirm('Are you sure you want to clear your entire shopping list?')) {
      this.shoppingListService.clearList();
    }
  }
}