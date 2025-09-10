import { Injectable } from '@angular/core';
import { BarcodeLookupService } from './barcode-lookup.service';
import { OpenFoodFactsService } from './open-food-facts.service';
import { NotificationService } from './notification.service';
import { Product } from '../services/product-db.service';
import { AudioService } from './audio.service';
import { ProductManagerService } from './product-manager.service';

@Injectable({
  providedIn: 'root'
})
export class BarcodeProcessorService {

  constructor(
    private barcodeLookupService: BarcodeLookupService,
    private offService: OpenFoodFactsService,
    private notificationService: NotificationService,
    private audioService: AudioService,
    private productManager: ProductManagerService
  ) { }

  async processBarcode(decodedText: string, signal: AbortSignal): Promise<Product | null> {
    try {
      let productData = await this.barcodeLookupService.getProductByBarcode(decodedText);

      if (signal.aborted) throw new Error('Operation aborted');

      if (!productData) {
        this.notificationService.showInfo('Primary source failed. Trying fallback...', 'Scanning');
        productData = await this.offService.getProductByBarcode(decodedText);
      }

      if (signal.aborted) throw new Error('Operation aborted');

      if (!productData) {
        this.notificationService.showWarning('Product not found in any database.', 'Not Found');
        this.audioService.playErrorSound();
        return null;
      }

      // Delegate processing and saving to the ProductManagerService
      const savedProduct = await this.productManager.processAndAddProduct({
        barcode: decodedText,
        name: productData.name || "Unknown Product",
        brand: productData.brand || "Unknown Brand",
        ingredients: productData.ingredients || [],
        calories: productData.calories ?? undefined,
        image: productData.image,
        source: 'scan'
      });

      return savedProduct;

    } catch (error: any) {
      if (error.message === 'Operation aborted') {
        throw error;
      } else {
        console.error('Barcode processing error:', error);
        this.notificationService.showError('Failed to process barcode.', 'Error');
        this.audioService.playErrorSound();
        return null;
      }
    }
  }
}