import { Injectable, isDevMode } from '@angular/core'; // Import isDevMode
import { BehaviorSubject } from 'rxjs';
import { ProductDbService, Product } from './product-db.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { SpeechService } from './speech.service';
import { LeaderboardService } from './leaderboard.service';
import { supabase } from '../../integrations/supabase/client';

export interface ShoppingListItem {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  brand: string;
  image_url?: string;
  purchased: boolean;
  created_at: string;
  product?: Product; // New: To store the full product metadata
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
    private speechService: SpeechService,
    private leaderboardService: LeaderboardService,
    private productDbService: ProductDbService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadData(); // Use a unified load method
    });
  }

  private getStorageKey(): string {
    return this.currentUserId ? `fatBoyShoppingList_${this.currentUserId}` : 'fatBoyShoppingList_anonymous_dev';
  }

  private async loadData(): Promise<void> {
    if (this.currentUserId) {
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      this.loadFromSessionStorage(); // Load from session storage in dev mode if not logged in
    } else {
      this.shoppingList = [];
      this.listSubject.next([]);
    }
  }

  async addItem(product: Product): Promise<void> {
    if (!this.currentUserId && !isDevMode()) {
      this.notificationService.showError('Please log in to add items to your shopping list.');
      this.speechService.speak('Please log in to add items to your shopping list.');
      return;
    }

    const newItemData = {
      user_id: this.currentUserId || 'anonymous_dev', // Use dummy ID for dev mode
      product_id: product.id,
      product_name: product.name,
      brand: product.brand,
      image_url: product.image,
      purchased: false,
      created_at: new Date().toISOString(),
      product: product // Store the full product object
    };

    if (this.currentUserId) {
      // Check if item already exists for the current user in Supabase
      const { data: existingItems, error: checkError } = await supabase
        .from('shopping_list_items')
        .select('id')
        .eq('user_id', this.currentUserId)
        .eq('product_id', product.id);

      if (checkError) {
        console.error('Error checking for existing shopping list item in Supabase:', checkError);
        this.notificationService.showError('Failed to check shopping list for duplicates.');
        return;
      }

      if (existingItems && existingItems.length > 0) {
        this.notificationService.showWarning('This item is already on your shopping list.', 'Already Added');
        this.speechService.speak('This item is already on your shopping list.');
        return;
      }
      
      const { data, error } = await supabase
        .from('shopping_list_items')
        .insert(newItemData)
        .select()
        .single();

      if (error) {
        console.error('Error adding item to shopping list in Supabase:', error);
        this.notificationService.showError('Failed to add item to shopping list.');
        this.speechService.speak('Failed to add item to shopping list.');
        throw error;
      }
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      // Add to session storage for dev mode
      const tempItem: ShoppingListItem = { ...newItemData, id: Date.now().toString() }; // Generate temp ID
      this.shoppingList.unshift(tempItem);
      this.saveToSessionStorage();
      this.listSubject.next([...this.shoppingList]);
    }
    
    if (product.verdict === 'good') {
      this.leaderboardService.incrementScore(25).subscribe();
    }
    this.notificationService.showSuccess(`${product.name} added to your shopping list!`, 'Added to List');
    this.speechService.speak(`${product.name} added to your shopping list!`);
  }

  async removeItem(itemId: string): Promise<void> {
    if (!this.currentUserId && !isDevMode()) {
      this.notificationService.showError('Please log in to remove items from your shopping list.');
      return;
    }

    if (this.currentUserId) {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', this.currentUserId);

      if (error) {
        console.error('Error removing item from shopping list in Supabase:', error);
        this.notificationService.showError('Failed to remove item from shopping list.');
        throw error;
      }
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      this.shoppingList = this.shoppingList.filter(i => i.id !== itemId);
      this.saveToSessionStorage();
      this.listSubject.next([...this.shoppingList]);
    }
    this.notificationService.showInfo('Item removed from shopping list.', 'Removed');
    this.speechService.speak('Item removed from shopping list.');
  }

  async toggleItemPurchased(itemId: string): Promise<void> {
    if (!this.currentUserId && !isDevMode()) {
      this.notificationService.showError('Please log in to update items in your shopping list.');
      return;
    }

    const item = this.shoppingList.find(i => i.id === itemId);
    if (!item) {
      this.notificationService.showWarning('Item not found in shopping list.', 'Not Found');
      return;
    }

    const newPurchasedStatus = !item.purchased;

    if (this.currentUserId) {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .update({ purchased: newPurchasedStatus })
        .eq('id', itemId)
        .eq('user_id', this.currentUserId)
        .select()
        .single();

      if (error) {
        console.error('Error toggling item purchased status in Supabase:', error);
        this.notificationService.showError('Failed to update item status.');
        throw error;
      }
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      const index = this.shoppingList.findIndex(i => i.id === itemId);
      if (index !== -1) {
        this.shoppingList[index].purchased = newPurchasedStatus;
        this.saveToSessionStorage();
        this.listSubject.next([...this.shoppingList]);
      }
    }
    this.notificationService.showInfo(`Item marked as ${newPurchasedStatus ? 'purchased' : 'not purchased'}.`, 'Updated');
    this.speechService.speak(`Item marked as ${newPurchasedStatus ? 'purchased' : 'not purchased'}.`);
  }

  async clearList(): Promise<void> {
    if (!this.currentUserId && !isDevMode()) {
      this.notificationService.showError('Please log in to clear your shopping list.');
      return;
    }

    if (this.currentUserId) {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('user_id', this.currentUserId);

      if (error) {
        console.error('Error clearing shopping list in Supabase:', error);
        this.notificationService.showError('Failed to clear shopping list.');
        throw error;
      }
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      this.shoppingList = [];
      this.saveToSessionStorage();
      this.listSubject.next([]);
    }
    this.notificationService.showInfo('Shopping list cleared.', 'Cleared');
    this.speechService.speak('Shopping list cleared.');
  }

  private async loadFromSupabase(): Promise<void> {
    if (!this.currentUserId) return;

    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('user_id', this.currentUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading shopping list from Supabase:', error);
      this.shoppingList = [];
      this.listSubject.next([]);
      return;
    }

    const loadedItems: ShoppingListItem[] = [];
    for (const item of data) {
      const fullProduct = await this.productDbService.getProductByClientSideId(item.product_id);
      loadedItems.push({
        ...item,
        product: fullProduct || undefined
      });
    }

    this.shoppingList = loadedItems;
    this.listSubject.next([...this.shoppingList]);
  }

  private loadFromSessionStorage(): void {
    const stored = sessionStorage.getItem(this.getStorageKey());
    if (stored) {
      this.shoppingList = JSON.parse(stored);
      this.listSubject.next([...this.shoppingList]);
    } else {
      this.shoppingList = [];
      this.listSubject.next([]);
    }
  }

  private saveToSessionStorage(): void {
    sessionStorage.setItem(this.getStorageKey(), JSON.stringify(this.shoppingList));
  }
}