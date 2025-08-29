import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService, Product } from '../services/product-db.service';

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
  flaggedItems: { ingredient: string, reason: string }[] = [];

  constructor(
    private router: Router,
    private ingredientParser: IngredientParserService,
    private productDb: ProductDbService
  ) {}

  ngOnInit() {
    const productData = sessionStorage.getItem('scannedProduct');
    if (productData) {
      this.product = JSON.parse(productData);
      this.evaluateProduct();
      this.addToHistory();
    } else {
      this.router.navigate(['/scanner']);
    }
  }

  evaluateProduct() {
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');
    const ingredients = Array.isArray(this.product.ingredients) ? this.product.ingredients : [];
    
    const evaluation = this.ingredientParser.evaluateProduct(ingredients, this.product.calories, preferences);
    
    this.verdict = evaluation.verdict;
    this.flaggedItems = evaluation.flaggedIngredients;
  }

  private addToHistory(): void {
    if (!this.product) return;

    const categories = this.ingredientParser.categorizeProduct(
      Array.isArray(this.product.ingredients) ? this.product.ingredients : []
    );

    const productInfo: Omit<Product, 'id' | 'scanDate'> = {
      name: this.product.name || 'Unknown Product',
      brand: this.product.brand || 'Unknown Brand',
      barcode: this.product.barcode,
      ingredients: Array.isArray(this.product.ingredients) ? this.product.ingredients : [],
      calories: this.product.calories,
      image: this.product.image,
      categories,
      verdict: this.verdict,
      flaggedIngredients: this.flaggedItems.map(f => f.ingredient)
    };

    const saved = this.productDb.addProduct(productInfo);
    sessionStorage.setItem('viewingProduct', JSON.stringify(saved));
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