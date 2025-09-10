import { Injectable } from '@angular/core';
import Tesseract from 'tesseract.js';
import { OcrEnhancerService } from './ocr-enhancer.service';
import { PreferencesService } from './preferences.service';
import { NotificationService } from './notification.service';
import { Product } from '../services/product-db.service';
import { AudioService } from './audio.service';
import { OnDeviceOcrService } from './on-device-ocr.service';
import { ProductManagerService } from './product-manager.service';

@Injectable({
  providedIn: 'root'
})
export class OcrProcessorService {

  constructor(
    private ocrEnhancer: OcrEnhancerService,
    private preferencesService: PreferencesService,
    private notificationService: NotificationService,
    private audioService: AudioService,
    private onDeviceOcrService: OnDeviceOcrService,
    private productManager: ProductManagerService
  ) { }

  async processImageForOcr(imageDataUrl: string, signal: AbortSignal): Promise<Product | null> {
    let text = '';
    const preferences = this.preferencesService.getPreferences();

    try {
      if (preferences.onDeviceInference && this.onDeviceOcrService.isModelLoaded()) {
        this.notificationService.showInfo('Using on-device OCR...', 'On-Device AI');
        text = await this.onDeviceOcrService.recognize(imageDataUrl, signal);
      } else {
        this.notificationService.showInfo('Using cloud-based OCR (Tesseract.js)...', 'Cloud AI');
        const result = await Tesseract.recognize(imageDataUrl, 'eng', { signal } as any);
        text = result.data?.text || '';
      }

      if (signal.aborted) throw new Error('Operation aborted');

      if (!text || text.trim().length === 0) {
        this.notificationService.showWarning('No text detected. Please try a different image.', 'OCR Failed');
        this.audioService.playErrorSound();
        return null;
      }

      const enhancedIngredients = this.ocrEnhancer.enhanceIngredientDetection(text);
      const productName = this.ocrEnhancer.detectProductName(text);
      const brand = this.ocrEnhancer.detectBrand(text);

      // Delegate processing and saving to the ProductManagerService
      const savedProduct = await this.productManager.processAndAddProduct({
        name: productName,
        brand: brand,
        ingredients: enhancedIngredients,
        ocrText: text,
        source: 'ocr'
      });

      return savedProduct;

    } catch (err: any) {
      if (err.message === 'Operation aborted') {
        throw err;
      } else {
        console.error('OCR processing error:', err);
        this.notificationService.showError('Failed to process the image. Please try again.', 'Error');
        this.audioService.playErrorSound();
        return null;
      }
    }
  }
}