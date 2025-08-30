import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from './product-db.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { SpeechService } from './speech.service';

export interface ShoppingListItem extends Product {
  purchased: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {
  private shoppingList: ShoppingListItem[] = [];
  private listSubject = new BehaviorSubject<ShoppingListItem[]>([]);
  
  public list$ = this.listSubject.asObservable();
  private currentUserId: string | null = null;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private speechService: SpeechService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadFromStorage(); // Reload data when user changes
    });
  }

  addItem(product: Product): void {
    if (this.shoppingList.some(item => item.id === product.id)) {
      this.notificationService.showWarning('This item is already on your shopping list.', 'Already Added');
      this.speechService.speak('This item is already on your shopping list.');
      return;
    }
    
    const newItem: ShoppingListItem = { ...product, purchased: false };
    this.shoppingList.unshift(newItem);
    this.saveToStorage();
    this.listSubject.next([...this.shoppingList]);
    this.notificationService.showSuccess(`${product.name} added to your shopping list!`, 'Added to List');
    this.speechService.speak(`${product.name} added to your shopping list!`);
  }

  removeItem(productId: string): void {
    this.shoppingList = this.shoppingList.filter(item => item.id !== productId);
    this.saveToStorage();
    this.listSubject.next([...this.shoppingList]);
    this.notificationService.showInfo('Item removed from shopping list.', 'Removed');
    this.speechService.speak('Item removed from shopping list.');
  }

  toggleItemPurchased(productId: string): void {
    const item = this.shoppingList.find(i => i.id === productId);
    if (item) {
      item.purchased = !item.purchased;
      this.saveToStorage();
      this.listSubject.next([...this.shoppingList]);
      this.notificationService.showInfo(`Item marked as ${item.purchased ? 'purchased' : 'not purchased'}.`, 'Updated');
      this.speechService.speak(`Item marked as ${item.purchased ? 'purchased' : 'not purchased'}.`);
    }
  }

  clearList(): void {
    if (confirm('Are you sure you want to clear your entire shopping list?')) {
      this.shoppingList = [];
      this.saveToStorage();
      this.listSubject.next([]);
      this.notificationService.showInfo('Shopping list cleared.', 'Cleared');
      this.speechService.speak('Shopping list cleared.');
    }
  }

  private getStorageKey(): string {
    return this.currentUserId ? `fatBoyShoppingList_${this.currentUserId}` : 'fatBoyShoppingList_anonymous';
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.getStorageKey());
    if (stored) {
      this.shoppingList = JSON.parse(stored);
      this.listSubject.next([...this.shoppingList]);
    } else {
      this.shoppingList = [];
      this.listSubject.next([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.shoppingList));
  }
}