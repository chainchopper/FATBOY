import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from './product-db.service';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private display = new BehaviorSubject<'open' | 'closed'>('closed');
  private product = new BehaviorSubject<Product | null>(null);

  watch(): Observable<'open' | 'closed'> {
    return this.display.asObservable();
  }

  watchProduct(): Observable<Product | null> {
    return this.product.asObservable();
  }

  open(product: Product) {
    this.product.next(product);
    this.display.next('open');
  }

  close() {
    this.display.next('closed');
    this.product.next(null);
  }
}