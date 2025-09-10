import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { LeaderboardService } from './leaderboard.service';
import { supabase } from '../../integrations/supabase/client';
import { NotificationService } from './notification.service';

export interface Product {
  id: string;
  name: string;
  brand: string;
  barcode?: string;
  ingredients: string[];
  calories?: number;
  image?: string;
  verdict: 'good' | 'bad';
  flaggedIngredients: string[];
  scanDate: Date;
  ocrText?: string;
  categories: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductDbService {
  private products: Product[] = [];
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  private avoidedProducts: Product[] = [];
  private avoidedProductsSubject = new BehaviorSubject<Product[]>([]);
  public avoidedProducts$ = this.avoidedProductsSubject.asObservable();
  
  private favorites: Product[] = [];
  private favoritesSubject = new BehaviorSubject<Product[]>([]);
  public favorites$ = this.favoritesSubject.asObservable();
  private favoriteProductIds = new Set<string>();
  
  private currentUserId: string | null = null;

  // New: Centralized state for the last viewed product
  private lastViewedProductSubject = new BehaviorSubject<Product | null>(null);
  public lastViewedProduct$ = this.lastViewedProductSubject.asObservable();

  constructor(
    private authService: AuthService,
    private leaderboardService: LeaderboardService,
    private notificationService: NotificationService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadData();
    });
  }

  public setLastViewedProduct(product: Product | null): void {
    this.lastViewedProductSubject.next(product);
  }

  public getLastViewedProduct(): Product | null {
    return this.lastViewedProductSubject.getValue();
  }

  private async loadData(): Promise<void> {
    if (this.currentUserId) {
      await this.loadFromSupabase();
    } else {
      // If no user, clear local data
      this.products = [];
      this.avoidedProducts = [];
      this.favorites = [];
      this.favoriteProductIds.clear();
      this.productsSubject.next([]);
      this.avoidedProductsSubject.next([]);
      this.favoritesSubject.next([]);
      this.lastViewedProductSubject.next(null); // Clear last viewed product
    }
  }

  private async loadFromSupabase(): Promise<void> {
    if (!this.currentUserId) return;

    const { data, error } = await supabase
      .from('user_products')
      .select('product_data, type')
      .eq('user_id', this.currentUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading products from Supabase:', error);
      this.products = [];
      this.avoidedProducts = [];
      this.productsSubject.next([]);
      this.avoidedProductsSubject.next([]);
      return;
    }

    const loadedProducts: Product[] = [];
    const loadedAvoidedProducts: Product[] = [];

    data.forEach((item: any) => {
      const product: Product = {
        ...item.product_data,
        scanDate: new Date(item.product_data.scanDate)
      };
      if (item.type === 'scanned') {
        loadedProducts.push(product);
      } else if (item.type === 'saved_avoided') {
        loadedAvoidedProducts.push(product);
      }
    });

    this.products = loadedProducts;
    this.avoidedProducts = loadedAvoidedProducts;
    this.productsSubject.next([...this.products]);
    this.avoidedProductsSubject.next([...this.avoidedProducts]);

    // Now load favorites
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('fatboy_user_favorites')
      .select('product_client_id')
      .eq('user_id', this.currentUserId);

    if (favoritesError) {
      console.error('Error loading favorites from Supabase:', favoritesError);
      this.favorites = [];
      this.favoriteProductIds.clear();
    } else {
      this.favoriteProductIds = new Set(favoritesData.map(f => f.product_client_id));
      this.favorites = this.products.filter(p => this.favoriteProductIds.has(p.id));
    }
    this.favoritesSubject.next([...this.favorites]);
  }

  async addProduct(product: Omit<Product, 'id' | 'scanDate'>): Promise<Product | null> {
    if (!this.currentUserId) {
      this.notificationService.showError('You must be logged in to save products.', 'Login Required');
      return null; // Return null if not authenticated
    }

    const newProduct: Product = {
      ...product,
      id: this.generateId(),
      scanDate: new Date()
    };

    const { error } = await supabase
      .from('user_products')
      .insert({
        user_id: this.currentUserId,
        product_data: newProduct,
        type: 'scanned'
      });

    if (error) {
      console.error('Error adding product to Supabase:', error);
      this.notificationService.showError('Failed to save product.', 'Error');
      return null;
    }
    
    supabase.rpc('log_user_activity', { 
      activity_type: 'scan', 
      activity_description: `Scanned: ${newProduct.name}` 
    }).then();

    await this.loadData();
    this.leaderboardService.incrementScore(10).subscribe();
    return newProduct;
  }

  async addAvoidedProduct(product: Omit<Product, 'id' | 'scanDate'>): Promise<Product | null> {
    if (!this.currentUserId) {
      this.notificationService.showError('You must be logged in to save products.');
      return null;
    }

    const newProduct: Product = {
      ...product,
      id: this.generateId(),
      scanDate: new Date(),
      verdict: 'bad',
      flaggedIngredients: product.flaggedIngredients.length > 0 ? product.flaggedIngredients : ['Manually added to avoid list']
    };

    const { error } = await supabase
      .from('user_products')
      .insert({
        user_id: this.currentUserId,
        product_data: newProduct,
        type: 'saved_avoided'
      });

    if (error) {
      console.error('Error adding avoided product to Supabase:', error);
      this.notificationService.showError('Failed to save avoided product.');
      return null;
    }
    
    await this.loadData();
    return newProduct;
  }

  getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  async getProductByClientSideId(clientSideId: string): Promise<Product | null> {
    if (!this.currentUserId) return null;

    const { data, error } = await supabase
      .from('user_products')
      .select('product_data')
      .filter('product_data->>id', 'eq', clientSideId)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching product by client-side ID from Supabase:', error);
      return null;
    }
    if (data) {
      return { ...data.product_data, scanDate: new Date(data.product_data.scanDate) } as Product;
    }
    return null;
  }

  getProductsSnapshot(): Product[] {
    return this.productsSubject.getValue();
  }

  getProductsByCategory(category: string): Product[] {
    return this.products.filter(p => p.categories.includes(category));
  }

  getFlaggedIngredientsStats(): {ingredient: string, count: number}[] {
    const ingredientCounts: {[key: string]: number} = {};
    this.products.forEach(product => {
      product.flaggedIngredients.forEach(ingredient => {
        ingredientCounts[ingredient] = (ingredientCounts[ingredient] || 0) + 1;
      });
    });
    return Object.entries(ingredientCounts)
      .map(([ingredient, count]) => ({ingredient, count}))
      .sort((a, b) => b.count - a.count);
  }

  async removeProduct(id: string): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('You must be logged in to modify products.');
      return;
    }

    const { error } = await supabase
      .from('user_products')
      .delete()
      .eq('user_id', this.currentUserId)
      .filter('product_data->>id', 'eq', id);

    if (error) {
      console.error('Error removing product from Supabase:', error);
      this.notificationService.showError('Failed to remove product.');
      return;
    }
    await this.loadData();
  }

  async removeAvoidedProduct(id: string): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('You must be logged in to modify products.');
      return;
    }

    const { error } = await supabase
      .from('user_products')
      .delete()
      .eq('user_id', this.currentUserId)
      .eq('type', 'saved_avoided')
      .filter('product_data->>id', 'eq', id);

    if (error) {
      console.error('Error removing avoided product from Supabase:', error);
      this.notificationService.showError('Failed to remove avoided product.');
      return;
    }
    await this.loadData();
  }

  async clearAll(): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('You must be logged in to clear your history.');
      return;
    }

    const { error } = await supabase
      .from('user_products')
      .delete()
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('Error clearing all products from Supabase:', error);
      this.notificationService.showError('Failed to clear history.');
      return;
    }
    await this.loadData();
  }

  isFavorite(productId: string): boolean {
    return this.favoriteProductIds.has(productId);
  }

  async toggleFavorite(productId: string): Promise<void> {
    if (!this.currentUserId) {
      this.notificationService.showError('You must be logged in to manage favorites.');
      return;
    }

    const isCurrentlyFavorite = this.isFavorite(productId);

    if (isCurrentlyFavorite) {
      const { error } = await supabase
        .from('fatboy_user_favorites')
        .delete()
        .eq('user_id', this.currentUserId)
        .eq('product_client_id', productId);
      
      if (error) {
        this.notificationService.showError('Failed to remove favorite.');
      } else {
        this.notificationService.showInfo('Removed from favorites.');
      }
    } else {
      const { error } = await supabase
        .from('fatboy_user_favorites')
        .insert({
          user_id: this.currentUserId,
          product_client_id: productId
        });

      if (error) {
        this.notificationService.showError('Failed to add favorite.');
      } else {
        this.notificationService.showSuccess('Added to favorites!');
      }
    }
    await this.loadData();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}