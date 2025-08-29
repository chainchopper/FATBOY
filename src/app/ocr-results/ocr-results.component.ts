import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Product } from '../services/product-db.service';

@Component({
  selector: 'app-ocr-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ocr-results.component.html',
  styleUrls: ['./ocr-results.component.css']
})
export class OcrResultsComponent implements OnInit {
  product: Product | null = null;
  verdict: 'good' | 'bad' = 'bad';
  flaggedIngredients: string[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    const productData = sessionStorage.getItem('viewingProduct');
    if (productData) {
      this.product = JSON.parse(productData);
      this.evaluateProduct();
    } else {
      this.router.navigate(['/scanner']);
    }
  }

  private evaluateProduct(): void {
    if (!this.product) return;

    // Get user preferences
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');
    
    // Simple evaluation based on flagged ingredients from the product
    this.flaggedIngredients = this.product.flaggedIngredients;
    this.verdict = this.flaggedIngredients.length === 0 ? 'good' : 'bad';
  }

  isIngredientFlagged(ingredient: string): boolean {
    return this.flaggedIngredients.some(fi => 
      ingredient.toLowerCase().includes(fi.toLowerCase())
    );
  }

  saveProduct(): void {
    if (!this.product) return;

    const savedProducts = JSON.parse(localStorage.getItem('savedProducts') || '[]');
    savedProducts.push(this.product);
    localStorage.setItem('savedProducts', JSON.stringify(savedProducts));
    alert('Product saved!');
  }

  scanAgain(): void {
    this.router.navigate(['/scanner']);
  }

  viewRawText(): void {
    if (this.product?.ocrText) {
      alert(this.product.ocrText);
    } else {
      alert('No raw text available.');
    }
  }
}