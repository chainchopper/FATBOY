import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ocr-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ocr-results.component.html',
  styleUrls: ['./ocr-results.component.css']
})
export class OcrResultsComponent implements OnInit {
  product: any;
  verdict: 'good' | 'bad' = 'bad';
  flaggedIngredients: string[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    const productData = sessionStorage.getItem('ocrProduct');
    if (productData) {
      this.product = JSON.parse(productData);
      this.evaluateProduct();
    } else {
      this.router.navigate(['/scanner']);
    }
  }

  evaluateProduct() {
    // Get user preferences
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');
    
    // Simple rule engine for OCR results
    this.flaggedIngredients = [];
    
    if (preferences.avoidArtificialSweeteners) {
      const artificialSweeteners = ['aspartame', 'sucralose', 'saccharin', 'acesulfame'];
      artificialSweeteners.forEach(sweetener => {
        if (this.product.ingredients.some((ing: string) => 
          ing.toLowerCase().includes(sweetener))) {
          this.flaggedIngredients.push(sweetener);
        }
      });
    }
    
    if (preferences.avoidHFCS && this.product.ingredients.some((ing: string) => 
        ing.toLowerCase().includes('high-fructose corn syrup') || ing.toLowerCase().includes('hfcs'))) {
      this.flaggedIngredients.push('High-Fructose Corn Syrup');
    }
    
    if (preferences.avoidArtificialColors) {
      const artificialColors = ['red 40', 'yellow 5', 'blue 1', 'red 3', 'yellow 6'];
      artificialColors.forEach(color => {
        if (this.product.ingredients.some((ing: string) => 
          ing.toLowerCase().includes(color))) {
          this.flaggedIngredients.push(color);
        }
      });
    }
    
    // Determine verdict
    this.verdict = this.flaggedIngredients.length === 0 ? 'good' : 'bad';
  }

  saveProduct() {
    const savedProducts = JSON.parse(localStorage.getItem('savedProducts') || '[]');
    savedProducts.push(this.product);
    localStorage.setItem('savedProducts', JSON.stringify(savedProducts));
    alert('Product saved!');
  }

  scanAgain() {
    this.router.navigate(['/ocr-scanner']);
  }

  viewRawText() {
    alert(this.product.rawText);
  }
}