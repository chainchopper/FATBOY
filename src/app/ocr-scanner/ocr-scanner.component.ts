import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-ocr-scanner',
  standalone: true,
  templateUrl: './ocr-scanner.component.html',
  styleUrls: ['./ocr-scanner.component.css']
})
export class OcrScannerComponent implements AfterViewInit {
  @ViewChild('reader') reader!: ElementRef;
  private html5QrcodeScanner!: Html5Qrcode;
  isScanning = false;

  // Mock services for OCR enhancement - define them as empty objects for now
  private ocrEnhancer: any = {
    enhanceIngredientDetection: (text: string) => text.split(', '),
    detectProductName: (text: string) => 'Sample Product',
    detectBrand: (text: string) => 'Sample Brand'
  };

  private ingredientParser: any = {
    categorizeProduct: (ingredients: string[]) => ['category1', 'category2']
  };

  private evaluateIngredients = (ingredients: string[], preferences: any) => 
    ingredients.filter(ing => ing.toLowerCase().includes('artificial'));

  private productDb: any = {
    addProduct: (product: any) => product
  };

  constructor(private router: Router) {}

  async ngAfterViewInit() {
    try {
      this.html5QrcodeScanner = new Html5Qrcode("reader");
    } catch (error) {
      console.error('Error initializing scanner:', error);
    }
  }

  processExtractedText(text: string) {
    // Use enhanced OCR processing
    const enhancedIngredients = this.ocrEnhancer.enhanceIngredientDetection(text);
    const productName = this.ocrEnhancer.detectProductName(text);
    const brand = this.ocrEnhancer.detectBrand(text);

    // Parse ingredients
    const categories = this.ingredientParser.categorizeProduct(enhancedIngredients);

    // Get user preferences
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');

    // Evaluate product
    const flaggedIngredients = this.evaluateIngredients(enhancedIngredients, preferences);
    const verdict = flaggedIngredients.length === 0 ? 'good' : 'bad';

    // Prepare product info
    const productInfo = {
      name: productName,
      brand: brand,
      ingredients: enhancedIngredients,
      categories: categories,
      ocrText: text
    };

    // Add to database
    const product = this.productDb.addProduct({
      ...productInfo,
      verdict: verdict,
      flaggedIngredients: flaggedIngredients
    });

    // Navigate to results
    sessionStorage.setItem('viewingProduct', JSON.stringify(product));
    this.router.navigate(['/ocr-results']);
  }

  async startScanning() {
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

  stopScanning() {
    this.html5QrcodeScanner.stop().then(() => {
      this.isScanning = false;
    }).catch((error) => {
      console.error('Error stopping scanner:', error);
    });
  }

  ngOnDestroy() {
    if (this.html5QrcodeScanner && this.isScanning) {
      this.stopScanning();
    }
  }
}