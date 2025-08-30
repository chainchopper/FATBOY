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
  private products: Product[] = []; // For all scanned products (history)
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  private avoidedProducts: Product[] = []; // For explicitly avoided products
  private avoidedProductsSubject = new BehaviorSubject<Product[]>([]);
  public avoidedProducts$ = this.avoidedProductsSubject.asObservable();
  
  private currentUserId: string | null = null;

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadFromStorage(); // Reload all data when user changes
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

  addAvoidedProduct(product: Omit<Product, 'id' | 'scanDate'>): Product {
    const newProduct: Product = {
      ...product,
      id: this.generateId(),
      scanDate: new Date(),
      verdict: 'bad', // Explicitly mark as bad for avoided list
      flaggedIngredients: product.flaggedIngredients.length > 0 ? product.flaggedIngredients : ['Manually added to avoid list']
    };

    if (!this.avoidedProducts.some(p => p.barcode === newProduct.barcode && p.barcode)) { // Prevent duplicates by barcode
      this.avoidedProducts.unshift(newProduct);
      this.saveAvoidedToStorage();
      this.avoidedProductsSubject.next([...this.avoidedProducts]);
    }
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

  removeAvoidedProduct(id: string): void {
    this.avoidedProducts = this.avoidedProducts.filter(p => p.id !== id);
    this.saveAvoidedToStorage();
    this.avoidedProductsSubject.next([...this.avoidedProducts]);
  }

  clearAll(): void {
    this.products = [];
    this.avoidedProducts = [];
    this.saveToStorage();
    this.saveAvoidedToStorage();
    this.productsSubject.next([]);
    this.avoidedProductsSubject.next([]);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private getProductsStorageKey(): string {
    return this.currentUserId ? `fatBoyProducts_${this.currentUserId}` : 'fatBoyProducts_anonymous';
  }

  private getAvoidedProductsStorageKey(): string {
    return this.currentUserId ? `fatBoyAvoidedProducts_${this.currentUserId}` : 'fatBoyAvoidedProducts_anonymous';
  }

  private loadFromStorage(): void {
    const storedProducts = localStorage.getItem(this.getProductsStorageKey());
    if (storedProducts) {
      this.products = JSON.parse(storedProducts);
    } else {
      this.products = [];
    }
    this.productsSubject.next([...this.products]);

    const storedAvoided = localStorage.getItem(this.getAvoidedProductsStorageKey());
    if (storedAvoided) {
      this.avoidedProducts = JSON.parse(storedAvoided);
    } else {
      this.avoidedProducts = [];
    }
    this.avoidedProductsSubject.next([...this.avoidedProducts]);
  }

  private saveToStorage(): void {
    localStorage.setItem(this.getProductsStorageKey(), JSON.stringify(this.products));
  }

  private saveAvoidedToStorage(): void {
    localStorage.setItem(this.getAvoidedProductsStorageKey(), JSON.stringify(this.avoidedProducts));
  }
}