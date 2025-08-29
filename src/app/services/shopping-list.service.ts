import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from './product-db.service';
import { AuthService } from './auth.service';

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

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadFromStorage(); // Reload data when user changes
    });
  }

  addItem(product: Product): void {
    if (this.shoppingList.some(item => item.id === product.id)) {
      alert('This item is already on your shopping list.');
      return;
    }
    
    const newItem: ShoppingListItem = { ...product, purchased: false };
    this.shoppingList.unshift(newItem);
    this.saveToStorage();
    this.listSubject.next([...this.shoppingList]);
    alert(`${product.name} added to your shopping list!`);
  }

  removeItem(productId: string): void {
    this.shoppingList = this.shoppingList.filter(item => item.id !== productId);
    this.saveToStorage();
    this.listSubject.next([...this.shoppingList]);
  }

  toggleItemPurchased(productId: string): void {
    const item = this.shoppingList.find(i => i.id === productId);
    if (item) {
      item.purchased = !item.purchased;
      this.saveToStorage();
      this.listSubject.next([...this.shoppingList]);
    }
  }

  clearList(): void {
    this.shoppingList = [];
    this.saveToStorage();
    this.listSubject.next([]);
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