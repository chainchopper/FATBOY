import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { LeaderboardService } from './leaderboard.service';
import { supabase } from '../../integrations/supabase/client'; // Import Supabase client

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
  private products: Product[] = []; // For all scanned products (history)
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  private avoidedProducts: Product[] = []; // For explicitly avoided products
  private avoidedProductsSubject = new BehaviorSubject<Product[]>([]);
  public avoidedProducts$ = this.avoidedProductsSubject.asObservable();
  
  private currentUserId: string | null = null;

  constructor(
    private authService: AuthService,
    private leaderboardService: LeaderboardService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadFromSupabase(); // Reload all data when user changes
    });
  }

  async addProduct(product: Omit<Product, 'id' | 'scanDate'>): Promise<Product> {
    if (!this.currentUserId) {
      console.warn('Cannot add product: User not authenticated.');
      // Fallback for unauthenticated users (e.g., store in session storage temporarily)
      const tempProduct: Product = { ...product, id: this.generateId(), scanDate: new Date() };
      this.products.unshift(tempProduct);
      this.productsSubject.next([...this.products]);
      return tempProduct;
    }

    const newProduct: Product = {
      ...product,
      id: this.generateId(), // Generate client-side ID for consistency, Supabase will generate its own UUID
      scanDate: new Date()
    };
    
    const { data, error } = await supabase
      .from('user_products')
      .insert({
        user_id: this.currentUserId,
        product_data: newProduct,
        type: 'scanned' // All products added via scanner/manual entry are 'scanned'
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding product to Supabase:', error);
      throw error; // Propagate error
    }

    // Update local state from Supabase data
    await this.loadFromSupabase();
    
    // Add 10 points for each scan
    this.leaderboardService.incrementScore(10).subscribe();

    return newProduct; // Return the client-side generated product for immediate use
  }

  async addAvoidedProduct(product: Omit<Product, 'id' | 'scanDate'>): Promise<Product> {
    if (!this.currentUserId) {
      console.warn('Cannot add avoided product: User not authenticated.');
      const tempProduct: Product = {
        ...product,
        id: this.generateId(),
        scanDate: new Date(),
        verdict: 'bad',
        flaggedIngredients: product.flaggedIngredients.length > 0 ? product.flaggedIngredients : ['Manually added to avoid list']
      };
      this.avoidedProducts.unshift(tempProduct);
      this.avoidedProductsSubject.next([...this.avoidedProducts]);
      return tempProduct;
    }

    const newProduct: Product = {
      ...product,
      id: this.generateId(),
      scanDate: new Date(),
      verdict: 'bad', // Explicitly mark as bad for avoided list
      flaggedIngredients: product.flaggedIngredients.length > 0 ? product.flaggedIngredients : ['Manually added to avoid list']
    };

    // Check for duplicates by barcode if available
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
      return newProduct; // Return existing product without adding
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
    return newProduct;
  }

  getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
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
      this.products = this.products.filter(p => p.id !== id);
      this.productsSubject.next([...this.products]);
      return;
    }

    const { error } = await supabase
      .from('user_products')
      .delete()
      .eq('user_id', this.currentUserId)
      .filter('product_data->>id', 'eq', id); // Filter by client-side product_data.id

    if (error) {
      console.error('Error removing product from Supabase:', error);
      throw error;
    }
    await this.loadFromSupabase();
  }

  async removeAvoidedProduct(id: string): Promise<void> {
    if (!this.currentUserId) {
      this.avoidedProducts = this.avoidedProducts.filter(p => p.id !== id);
      this.avoidedProductsSubject.next([...this.avoidedProducts]);
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
      throw error;
    }
    await this.loadFromSupabase();
  }

  async clearAll(): Promise<void> {
    if (!this.currentUserId) {
      this.products = [];
      this.avoidedProducts = [];
      this.productsSubject.next([]);
      this.avoidedProductsSubject.next([]);
      return;
    }

    const { error } = await supabase
      .from('user_products')
      .delete()
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('Error clearing all products from Supabase:', error);
      throw error;
    }
    await this.loadFromSupabase();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private async loadFromSupabase(): Promise<void> {
    if (!this.currentUserId) {
      this.products = [];
      this.avoidedProducts = [];
      this.productsSubject.next([]);
      this.avoidedProductsSubject.next([]);
      return;
    }

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
        scanDate: new Date(item.product_data.scanDate) // Ensure scanDate is a Date object
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
}