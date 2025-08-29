import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import Tesseract from 'tesseract.js';

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

  constructor(private router: Router) {}

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
    // Simple parsing logic - this would be enhanced with ML/NLP in production
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Try to identify product name, brand, and ingredients
    const productInfo = {
      name: this.findProductName(lines),
      brand: this.findBrand(lines),
      ingredients: this.findIngredients(lines),
      rawText: text
    };

    // Store for results page
    sessionStorage.setItem('ocrProduct', JSON.stringify(productInfo));
    this.router.navigate(['/ocr-results']);
  }

  findProductName(lines: string[]): string {
    // Simple heuristic - often the first non-empty line
    return lines[0] || 'Unknown Product';
  }

  findBrand(lines: string[]): string {
    // Look for common brand indicators
    for (const line of lines) {
      if (line.match(/(inc|llc|co\.|corporation|company)/i)) {
        return line;
      }
    }
    return lines[1] || 'Unknown Brand';
  }

  findIngredients(lines: string[]): string[] {
    // Look for ingredients section
    let ingredientsStarted = false;
    const ingredients: string[] = [];
    
    for (const line of lines) {
      if (line.toLowerCase().includes('ingredients')) {
        ingredientsStarted = true;
        continue;
      }
      
      if (ingredientsStarted) {
        // Split by commas, semicolons, or other separators
        const items = line.split(/[,;]/).map(item => item.trim()).filter(item => item);
        ingredients.push(...items);
        
        // Stop if we hit another section (nutrition facts, etc.)
        if (line.match(/(nutrition|allergen|contains)/i)) {
          break;
        }
      }
    }
    
    return ingredients.length > 0 ? ingredients : ['Ingredients not found'];
  }

  ngOnDestroy() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}