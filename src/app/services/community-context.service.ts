import { Injectable } from '@angular/core';
import { Product } from './product-db.service';

@Injectable({
  providedIn: 'root'
})
export class CommunityContextService {
  private productToContribute: Product | null = null;

  setProduct(product: Product) {
    this.productToContribute = product;
  }

  getProduct(): Product | null {
    const product = this.productToContribute;
    this.clearContext(); // Clear after getting it to ensure it's used only once
    return product;
  }

  clearContext() {
    this.productToContribute = null;
  }
}