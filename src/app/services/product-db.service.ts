import { Injectable, isDevMode } from '@angular/core'; // Import isDevMode
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { LeaderboardService } from './leaderboard.service';
import { supabase } from '../../integrations/supabase/client';

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
  
  private currentUserId: string | null = null;

  constructor(
    private authService: AuthService,
    private leaderboardService: LeaderboardService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadData(); // Use a unified load method
    });
  }

  private getStorageKey(type: 'products' | 'avoidedProducts'): string {
    return this.currentUserId ? `fatBoy${type}_${this.currentUserId}` : `fatBoy${type}_anonymous_dev`;
  }

  private async loadData(): Promise<void> {
    if (this.currentUserId) {
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      this.loadFromSessionStorage(); // Load from session storage in dev mode if not logged in
    } else {
      this.products = [];
      this.avoidedProducts = [];
      this.productsSubject.next([]);
      this.avoidedProductsSubject.next([]);
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
  }

  private loadFromSessionStorage(): void {
    const storedProducts = sessionStorage.getItem(this.getStorageKey('products'));
    if (storedProducts) {
      this.products = JSON.parse(storedProducts).map((p: Product) => ({ ...p, scanDate: new Date(p.scanDate) }));
    } else {
      this.products = [];
    }

    const storedAvoidedProducts = sessionStorage.getItem(this.getStorageKey('avoidedProducts'));
    if (storedAvoidedProducts) {
      this.avoidedProducts = JSON.parse(storedAvoidedProducts).map((p: Product) => ({ ...p, scanDate: new Date(p.scanDate) }));
    } else {
      this.avoidedProducts = [];
    }
    this.productsSubject.next([...this.products]);
    this.avoidedProductsSubject.next([...this.avoidedProducts]);
  }

  private saveToSessionStorage(): void {
    sessionStorage.setItem(this.getStorageKey('products'), JSON.stringify(this.products));
    sessionStorage.setItem(this.getStorageKey('avoidedProducts'), JSON.stringify(this.avoidedProducts));
  }

  async addProduct(product: Omit<Product, 'id' | 'scanDate'>): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: this.generateId(),
      scanDate: new Date()
    };

    if (this.currentUserId) {
      const { data, error } = await supabase
        .from('user_products')
        .insert({
          user_id: this.currentUserId,
          product_data: newProduct,
          type: 'scanned'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding product to Supabase:', error);
        throw error;
      }
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      this.products.unshift(newProduct);
      this.saveToSessionStorage();
      this.productsSubject.next([...this.products]);
    } else {
      console.warn('Cannot add product: User not authenticated in production mode.');
    }
    
    this.leaderboardService.incrementScore(10).subscribe();
    return newProduct;
  }

  async addAvoidedProduct(product: Omit<Product, 'id' | 'scanDate'>): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: this.generateId(),
      scanDate: new Date(),
      verdict: 'bad',
      flaggedIngredients: product.flaggedIngredients.length > 0 ? product.flaggedIngredients : ['Manually added to avoid list']
    };

    if (this.currentUserId) {
      const { data: existingProducts, error: selectError } = await supabase
        .from('user_products')
        .select('product_data')
        .eq('user_id', this.currentUserId)
        .eq('type', 'saved_avoided')
        .filter('product_data->>barcode', 'eq', newProduct.barcode);

      if (selectError) {
        console.error('Error checking for existing avoided product:', selectError);
        throw selectError;
      }

      if (newProduct.barcode && existingProducts && existingProducts.length > 0) {
        console.warn('Avoided product with this barcode already exists for user.');
        return newProduct;
      }

      const { data, error } = await supabase
        .from('user_products')
        .insert({
          user_id: this.currentUserId,
          product_data: newProduct,
          type: 'saved_avoided'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding avoided product to Supabase:', error);
        throw error;
      }
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      this.avoidedProducts.unshift(newProduct);
      this.saveToSessionStorage();
      this.avoidedProductsSubject.next([...this.avoidedProducts]);
    } else {
      console.warn('Cannot add avoided product: User not authenticated in production mode.');
    }
    return newProduct;
  }

  getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  async getProductByClientSideId(clientSideId: string): Promise<Product | null> {
    if (this.currentUserId) {
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
    } else if (isDevMode()) {
      // Fallback to session storage for dev mode
      const allProducts = [...this.products, ...this.avoidedProducts];
      const foundProduct = allProducts.find(p => p.id === clientSideId);
      return foundProduct || null;
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
    if (this.currentUserId) {
      const { error } = await supabase
        .from('user_products')
        .delete()
        .eq('user_id', this.currentUserId)
        .filter('product_data->>id', 'eq', id);

      if (error) {
        console.error('Error removing product from Supabase:', error);
        throw error;
      }
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      this.products = this.products.filter(p => p.id !== id);
      this.saveToSessionStorage();
      this.productsSubject.next([...this.products]);
    } else {
      console.warn('Cannot remove product: User not authenticated in production mode.');
    }
  }

  async removeAvoidedProduct(id: string): Promise<void> {
    if (this.currentUserId) {
      const { error } = await supabase
        .from('user_products')
        .delete()
        .eq('user_id', this.currentUserId)
        .eq('type', 'saved_avoided')
        .filter('product_data->>id', 'eq', id);

      if (error) {
        console.error('Error removing avoided product from Supabase:', error);
        throw error;
      }
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      this.avoidedProducts = this.avoidedProducts.filter(p => p.id !== id);
      this.saveToSessionStorage();
      this.avoidedProductsSubject.next([...this.avoidedProducts]);
    } else {
      console.warn('Cannot remove avoided product: User not authenticated in production mode.');
    }
  }

  async clearAll(): Promise<void> {
    if (this.currentUserId) {
      const { error } = await supabase
        .from('user_products')
        .delete()
        .eq('user_id', this.currentUserId);

      if (error) {
        console.error('Error clearing all products from Supabase:', error);
        throw error;
      }
      await this.loadFromSupabase();
    } else if (isDevMode()) {
      this.products = [];
      this.avoidedProducts = [];
      this.saveToSessionStorage();
      this.productsSubject.next([]);
      this.avoidedProductsSubject.next([]);
    } else {
      console.warn('Cannot clear all products: User not authenticated in production mode.');
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}