import { Injectable } from '@angular/core';
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
  private realtimeSubscribed = false;
  private channel: ReturnType<typeof supabase.channel> | null = null;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private speechService: SpeechService,
    private leaderboardService: LeaderboardService,
    private productDbService: ProductDbService
  ) {
    this.authService.currentUser$.subscribe(user => {
      const prev = this.currentUserId;
      this.currentUserId = user?.id || null;
      this.loadData();
      if (prev !== this.currentUserId) {
        this.setupRealtime();
      }
    });
  }

  private async loadData(): Promise<void> {
    if (this.currentUserId) {
      await this.loadFromSupabase();
    } else {
      this.shoppingList = [];
      this.listSubject.next([]);
      this.teardownRealtime();
    }
  }

  private setupRealtime() {
    this.teardownRealtime();
    if (!this.currentUserId) return;

    this.channel = supabase.channel(`shopping-list-${this.currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fatboy_shopping_list_items', filter: `user_id=eq.${this.currentUserId}` },
        (_payload) => {
          // Refresh list on any change
          this.loadFromSupabase();
        }
      ).subscribe();
    this.realtimeSubscribed = true;
  }

  private teardownRealtime() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.realtimeSubscribed = false;
  }

  public isItemOnList(productId: string): boolean {
    return this.shoppingList.some(item => item.product_id === productId);
  }

  public getListSnapshot(): ShoppingListItem[] {
    return this.listSubject.getValue();
  }

  async addItem(product: Product): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('Please log in to add items to your shopping list.');
      this.speechService.speak('Please log in to add items to your shopping list.');
      return;
    }

    if (this.isItemOnList(product.id)) {
      this.notificationService.showWarning('This item is already on your shopping list.', 'Already Added');
      this.speechService.speak('This item is already on your shopping list.');
      return;
    }

    const newItemData = {
      user_id: this.currentUserId,
      product_id: product.id,
      product_name: product.name,
      brand: product.brand,
      image_url: product.image,
      purchased: false,
      product: product
    };
    
    const { error } = await supabase
      .from('fatboy_shopping_list_items')
      .insert(newItemData);

    if (error) {
      console.error('Error adding item to shopping list in Supabase:', error);
      this.notificationService.showError('Failed to add item to shopping list.');
      this.speechService.speak('Failed to add item to shopping list.');
      return;
    }
    
    // Log this activity
    supabase.rpc('fatboy_log_user_activity', { 
      activity_type: 'shopping_list', 
      activity_description: `Added ${product.name} to their shopping list.` 
    }).then();

    await this.loadData();
    
    if (product.verdict === 'good') {
      this.leaderboardService.incrementScore(25).subscribe();
    }
    this.notificationService.showSuccess(`${product.name} added to your shopping list!`, 'Added to List');
    this.speechService.speak(`${product.name} added to your shopping list!`);
  }

  async removeItem(itemId: string): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('Please log in to remove items from your shopping list.');
      return;
    }

    const { error } = await supabase
      .from('fatboy_shopping_list_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('Error removing item from shopping list in Supabase:', error);
      this.notificationService.showError('Failed to remove item from shopping list.');
      return;
    }
    
    await this.loadData();
    this.notificationService.showInfo('Item removed from shopping list.', 'Removed');
    this.speechService.speak('Item removed from shopping list.');
  }

  async removeItemByName(productName: string): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('Please log in to modify your shopping list.');
      return;
    }

    const itemToRemove = this.shoppingList.find(item => 
      item.product_name.toLowerCase() === productName.toLowerCase()
    );

    if (itemToRemove) {
      await this.removeItem(itemToRemove.id);
    } else {
      this.notificationService.showWarning(`Could not find "${productName}" on your shopping list.`);
      this.speechService.speak(`I couldn't find "${productName}" on your shopping list.`);
    }
  }

  async toggleItemPurchased(itemId: string): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('Please log in to update items in your shopping list.');
      return;
    }

    const item = this.shoppingList.find(i => i.id === itemId);
    if (!item) {
      this.notificationService.showWarning('Item not found in shopping list.', 'Not Found');
      return;
    }

    const newPurchasedStatus = !item.purchased;

    const { error } = await supabase
      .from('fatboy_shopping_list_items')
      .update({ purchased: newPurchasedStatus })
      .eq('id', itemId)
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('Error toggling item purchased status in Supabase:', error);
      this.notificationService.showError('Failed to update item status.');
      return;
    }
    
    await this.loadData();
    this.notificationService.showInfo(`Item marked as ${newPurchasedStatus ? 'purchased' : 'not purchased'}.`, 'Updated');
    this.speechService.speak(`Item marked as ${newPurchasedStatus ? 'purchased' : 'not purchased'}.`);
  }

  async clearList(): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('Please log in to clear your shopping list.');
      return;
    }
    const { error } = await supabase
      .from('fatboy_shopping_list_items')
      .delete()
      .eq('user_id', this.currentUserId);
    if (error) {
      console.error('Error clearing shopping list in Supabase:', error);
      this.notificationService.showError('Failed to clear shopping list.');
      return;
    }
    await this.loadData();
    this.notificationService.showSuccess('Your shopping list has been cleared.', 'Cleared');
    this.speechService.speak('Your shopping list has been cleared.');
  }

  private async loadFromSupabase(): Promise<void> {
    if (!this.currentUserId) return;

    const { data, error } = await supabase
      .from('fatboy_shopping_list_items')
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
}