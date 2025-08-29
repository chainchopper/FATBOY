import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

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
  private currentUserId: string | null = null;

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadFromStorage(); // Reload data when user changes
    });
  }

  addProduct(product: Omit<Product, 'id' | 'scanDate'>): Product {
    const newProduct: Product = {
      ...product,
      id: this.generateId(),
      scanDate: new Date()
    };
    
    this.products.unshift(newProduct);
    this.saveToStorage();
    this.productsSubject.next([...this.products]);
    
    return newProduct;
  }

  getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
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

  removeProduct(id: string): void {
    this.products = this.products.filter(p => p.id !== id);
    this.saveToStorage();
    this.productsSubject.next([...this.products]);
  }

  clearAll(): void {
    this.products = [];
    this.saveToStorage();
    this.productsSubject.next([]);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private getStorageKey(): string {
    return this.currentUserId ? `fatBoyProducts_${this.currentUserId}` : 'fatBoyProducts_anonymous';
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.getStorageKey());
    if (stored) {
      this.products = JSON.parse(stored);
      this.productsSubject.next([...this.products]);
    } else {
      this.products = [];
      this.productsSubject.next([]);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.products));
  }
}