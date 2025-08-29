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
    const productData = sessionStorage.getItem('viewingProduct');
    if (productData) {
      this.product = JSON.parse(productData);
      this.evaluateProduct();
    } else {
      this.router.navigate(['/scanner']);
    }
  }

  evaluateProduct() {
    // Mock evaluation logic
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');
    this.flaggedIngredients = this.product.ingredients.filter((ing: string) => 
      ing.toLowerCase().includes('artificial') || ing.toLowerCase().includes('preservative')
    );
    this.verdict = this.flaggedIngredients.length === 0 ? 'good' : 'bad';
  }

  isIngredientFlagged(ingredient: string): boolean {
    return this.flaggedIngredients.some(fi => 
      ingredient.toLowerCase().includes(fi.toLowerCase())
    );
  }

  saveProduct() {
    const savedProducts = JSON.parse(localStorage.getItem('savedProducts') || '[]');
    savedProducts.push(this.product);
    localStorage.setItem('savedProducts', JSON.stringify(savedProducts));
    alert('Product saved!');
  }

  scanAgain() {
    this.router.navigate(['/scanner']);
  }

  viewRawText() {
    // Placeholder for raw text view
    alert('Raw text view not implemented yet.');
  }
}