import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Html5Qrcode } from 'html5-qrcode';
import { OcrEnhancerService } from '../services/ocr-enhancer.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService, Product } from '../services/product-db.service';

@Component({
  selector: 'app-ocr-scanner',
  standalone: true,
  templateUrl: './ocr-scanner.component.html',
  styleUrls: ['./ocr-scanner.component.css']
})
export class OcrScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('reader') reader!: ElementRef;
  private html5QrcodeScanner!: Html5Qrcode;
  isScanning = false;

  constructor(
    private router: Router,
    private ocrEnhancer: OcrEnhancerService,
    private ingredientParser: IngredientParserService,
    private productDb: ProductDbService
  ) {}

  async ngAfterViewInit() {
    try {
      this.html5QrcodeScanner = new Html5Qrcode("reader");
    } catch (error) {
      console.error('Error initializing scanner:', error);
    }
  }

  private processExtractedText(text: string): void {
    // Use enhanced OCR processing
    const enhancedIngredients = this.ocrEnhancer.enhanceIngredientDetection(text);
    const productName = this.ocrEnhancer.detectProductName(text);
    const brand = this.ocrEnhancer.detectBrand(text);

    // Parse ingredients
    const categories = this.ingredientParser.categorizeProduct(enhancedIngredients);

    // Get user preferences
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');

    // Evaluate product based on preferences
    const flaggedIngredients = this.evaluateIngredients(enhancedIngredients, preferences);
    const verdict = flaggedIngredients.length === 0 ? 'good' : 'bad';

    // Prepare product info
    const productInfo: Omit<Product, 'id' | 'scanDate'> = {
      name: productName,
      brand: brand,
      ingredients: enhancedIngredients,
      categories: categories,
      verdict: verdict,
      flaggedIngredients: flaggedIngredients,
      ocrText: text
    };

    // Add to database
    const product = this.productDb.addProduct(productInfo);

    // Navigate to results
    sessionStorage.setItem('viewingProduct', JSON.stringify(product));
    this.router.navigate(['/ocr-results']);
  }

  private evaluateIngredients(ingredients: string[], preferences: any): string[] {
    const flagged: string[] = [];
    ingredients.forEach(ingredient => {
      const analysis = this.ingredientParser.analyzeIngredient(ingredient);
      if (analysis.flagged) {
        flagged.push(ingredient);
      }
    });
    return flagged;
  }

  async startScanning(): Promise<void> {
    try {
      this.isScanning = true;
      await this.html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => this.processExtractedText(decodedText),
        (error: string) => console.error('Scan failed:', error)
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
      this.isScanning = false;
    }
  }

  stopScanning(): void {
    this.html5QrcodeScanner.stop().then(() => {
      this.isScanning = false;
    }).catch((error) => {
      console.error('Error stopping scanner:', error);
    });
  }

  ngOnDestroy(): void {
    if (this.html5QrcodeScanner && this.isScanning) {
      this.stopScanning();
    }
  }
}