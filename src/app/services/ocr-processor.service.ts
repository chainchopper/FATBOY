import { Injectable } from '@angular/core';
import Tesseract from 'tesseract.js';
import { OcrEnhancerService } from './ocr-enhancer.service';
import { IngredientParserService } from './ingredient-parser.service';
import { PreferencesService } from './preferences.service';
import { NotificationService } from './notification.service';
import { Product } from '../services/product-db.service'; // Assuming Product interface is here
import { AudioService } from './audio.service';
import { OnDeviceOcrService } from './on-device-ocr.service'; // Import OnDeviceOcrService

@Injectable({
  providedIn: 'root'
})
export class OcrProcessorService {

  constructor(
    private ocrEnhancer: OcrEnhancerService,
    private ingredientParser: IngredientParserService,
    private preferencesService: PreferencesService,
    private notificationService: NotificationService,
    private audioService: AudioService,
    private onDeviceOcrService: OnDeviceOcrService // Inject OnDeviceOcrService
  ) { }

  async processImageForOcr(imageDataUrl: string, signal: AbortSignal): Promise<Omit<Product, 'id' | 'scanDate'> | null> {
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

      const categories = this.ingredientParser.categorizeProduct(enhancedIngredients);
      const evaluation = this.ingredientParser.evaluateProduct(enhancedIngredients, undefined, preferences);

      const productInfo: Omit<Product, 'id' | 'scanDate'> = {
        name: productName,
        brand: brand,
        ingredients: enhancedIngredients,
        categories,
        verdict: evaluation.verdict,
        flaggedIngredients: evaluation.flaggedIngredients.map(f => f.ingredient),
        ocrText: text,
        image: 'https://via.placeholder.com/150?text=OCR+Scan' // Default image for OCR
      };

      return productInfo;

    } catch (err: any) {
      if (err.message === 'Operation aborted') {
        throw err; // Re-throw to be caught by the calling function's abort handler
      } else {
        console.error('OCR processing error:', err);
        this.notificationService.showError('Failed to process the image. Please try again.', 'Error');
        this.audioService.playErrorSound();
        return null;
      }
    }
  }
}