import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import Tesseract from 'tesseract.js';
import { OcrEnhancerService } from '../services/ocr-enhancer.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService, Product } from '../services/product-db.service';

@Component({
  selector: 'app-ocr-scanner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ocr-scanner.component.html',
  styleUrls: ['./ocr-scanner.component.css']
})
export class OcrScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  private mediaStream: MediaStream | null = null;
  isProcessing = false;

  constructor(
    private router: Router,
    private ocrEnhancer: OcrEnhancerService,
    private ingredientParser: IngredientParserService,
    private productDb: ProductDbService
  ) {}

  async ngAfterViewInit() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      const video = this.videoElement.nativeElement;
      video.srcObject = this.mediaStream;
      await video.play();
    } catch (error) {
      console.error('Error accessing camera for OCR:', error);
      alert('Unable to access camera. Please allow camera permissions and try again.');
    }
  }

  async captureImage(): Promise<void> {
    if (this.isProcessing) return;
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    if (!video.videoWidth || !video.videoHeight) {
      alert('Camera not ready yet. Please try again in a moment.');
      return;
    }

    // Capture current frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.isProcessing = true;

    try {
      const dataUrl = canvas.toDataURL('image/png');

      // Run OCR with Tesseract
      const result = await Tesseract.recognize(dataUrl, 'eng');
      const text = result.data?.text || '';

      if (!text || text.trim().length === 0) {
        alert('No text detected. Please adjust lighting and try again.');
        this.isProcessing = false;
        return;
      }

      this.processExtractedText(text);
    } catch (err) {
      console.error('OCR error:', err);
      alert('Failed to process the image. Please try again.');
      this.isProcessing = false;
    }
  }

  private processExtractedText(text: string): void {
    // Enhanced OCR processing
    const enhancedIngredients = this.ocrEnhancer.enhanceIngredientDetection(text);
    const productName = this.ocrEnhancer.detectProductName(text);
    const brand = this.ocrEnhancer.detectBrand(text);

    // Categorize and evaluate
    const categories = this.ingredientParser.categorizeProduct(enhancedIngredients);

    // Evaluate ingredients using parser (simple rules for now)
    const flaggedIngredients = this.ingredientParser.evaluateIngredients(enhancedIngredients, {});
    const verdict: 'good' | 'bad' = flaggedIngredients.length === 0 ? 'good' : 'bad';

    // Build product info
    const productInfo: Omit<Product, 'id' | 'scanDate'> = {
      name: productName,
      brand: brand,
      ingredients: enhancedIngredients,
      categories,
      verdict,
      flaggedIngredients,
      ocrText: text
    };

    // Save to local DB (History)
    const product = this.productDb.addProduct(productInfo);

    // Navigate to OCR results
    sessionStorage.setItem('viewingProduct', JSON.stringify(product));
    this.isProcessing = false;
    this.router.navigate(['/ocr-results']);
  }

  ngOnDestroy(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }
}