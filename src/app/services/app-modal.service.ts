import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from './product-db.service';

interface ConfirmationData {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppModalService { // Renamed service
  private display = new BehaviorSubject<'open' | 'closed'>('closed');
  private product = new BehaviorSubject<Product | null>(null);
  private confirmationData = new BehaviorSubject<ConfirmationData | null>(null); // New subject for confirmation data

  watch(): Observable<'open' | 'closed'> {
    return this.display.asObservable();
  }

  watchProduct(): Observable<Product | null> {
    return this.product.asObservable();
  }

  watchConfirmationData(): Observable<ConfirmationData | null> {
    return this.confirmationData.asObservable();
  }

  open(product: Product) {
    this.product.next(product);
    this.confirmationData.next(null); // Clear any previous confirmation data
    this.display.next('open');
  }

  openConfirmation(data: ConfirmationData) {
    this.product.next(null); // Clear any previous product data
    this.confirmationData.next(data);
    this.display.next('open');
  }

  close() {
    this.display.next('closed');
    this.product.next(null);
    this.confirmationData.next(null);
  }
}