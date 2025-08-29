import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import Tesseract from 'tesseract.js';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService } from '../services/product-db.service';

@Component({
  selector: 'app-ocr-scanner',
  standalone: true,
  templateUrl: './ocr-scanner.component.html',
  styleUrls: ['./ocr-scanner.component.css']
})
export class OcrScannerComponent implements AfterViewInit {
  @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('canvasElement') canvasElement!: ElementRef;
  
  isScanning = false;
  extractedText = '';
  isProcessing = false;
  stream: MediaStream | null = null;

  constructor(
    private router: Router,
    private ingredientParser: IngredientParserService,
    private productDb: ProductDbService
  ) {}

  async ngAfterViewInit() {
    await this.setupCamera();
  }

  async setupCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      this.videoElement.nativeElement.srcObject = this.stream;
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  }

  async captureImage() {
    this.isProcessing = true;
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Process image with OCR
    try {
      const result = await Tesseract.recognize(
        canvas.toDataURL('image/jpeg'),
        'eng',
        { logger: m => console.log(m) }
      );
      
      this.extractedText = result.data.text;
      this.processExtractedText(this.extractedText);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Error processing image. Please try again.');
    } finally {
      this.isProcessing = false;
    }
  }

  processExtractedText(text: string) {
    // Parse ingredients using our improved service
    const ingredients = this.ingredientParser.parseIngredientList(text);
    const categories = this.ingredientParser.categorizeProduct(ingredients);
    
    // Get user preferences
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');
    
    // Evaluate product
    const flaggedIngredients = this.evaluateIngredients(ingredients, preferences);
    const verdict = flaggedIngredients.length === 0 ? 'good' : 'bad';
    
    // Create product object
    const productInfo = {
      name: this.findProductName(text),
      brand: this.findBrand(text),
      ingredients,
      verdict,
      flaggedIngredients,
      categories,
      ocrText: text
    };

    // Add to database
    const product = this.productDb.addProduct(productInfo);
    
    // Store for results page
    sessionStorage.setItem('viewingProduct', JSON.stringify(product));
    this.router.navigate(['/ocr-results']);
  }

  evaluateIngredients(ingredients: string[], preferences: any): string[] {
    const flagged: string[] = [];
    
    if (preferences.avoidArtificialSweeteners) {
      ingredients.forEach(ingredient => {
        const analysis = this.ingredientParser.analyzeIngredient(ingredient);
        if (analysis.categories.includes('artificialSweeteners') && analysis.flagged) {
          flagged.push(ingredient);
        }
      });
    }
    
    // Add similar checks for other preference categories
    
    return flagged;
  }

  findProductName(text: string): string {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return lines[0] || 'Unknown Product';
  }

  findBrand(text: string): string {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    for (const line of lines) {
      if (line.match(/(inc|llc|co\.|corporation|company)/i)) {
        return line;
      }
    }
    return lines[1] || 'Unknown Brand';
  }

  ngOnDestroy() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}