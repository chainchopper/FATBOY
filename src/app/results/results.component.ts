import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit {
  product: any;
  verdict: 'good' | 'bad' = 'bad';
  flaggedIngredients: string[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    const productData = sessionStorage.getItem('scannedProduct');
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
    
    // Simple rule engine
    this.flaggedIngredients = [];
    
    if (preferences.avoidArtificialSweeteners) {
      const artificialSweeteners = ['aspartame', 'sucralose', 'saccharin'];
      artificialSweeteners.forEach(sweetener => {
        if (this.product.ingredients.some((ing: string) => 
          ing.toLowerCase().includes(sweetener))) {
          this.flaggedIngredients.push(sweetener);
        }
      });
    }
    
    if (preferences.avoidHFCS && this.product.ingredients.some((ing: string) => 
        ing.toLowerCase().includes('high-fructose corn syrup'))) {
      this.flaggedIngredients.push('High-Fructose Corn Syrup');
    }
    
    if (preferences.maxCalories && this.product.calories > preferences.maxCalories) {
      this.flaggedIngredients.push(`High calories (${this.product.calories})`);
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
    this.router.navigate(['/scanner']);
  }
}