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
  flaggedIngredients: string[] = [];

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
    // Get user preferences
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');
    
    // Start clean
    this.flaggedIngredients = [];

    // Check common preferences
    if (preferences.avoidArtificialSweeteners) {
      const artificialSweeteners = ['aspartame', 'sucralose', 'saccharin'];
      artificialSweeteners.forEach((sweetener: string) => {
        if (this.product.ingredients?.some((ing: string) => 
          String(ing).toLowerCase().includes(sweetener))) {
          this.flaggedIngredients.push(sweetener);
        }
      });
    }
    
    if (preferences.avoidHFCS && this.product.ingredients?.some((ing: string) => 
        String(ing).toLowerCase().includes('high-fructose corn syrup'))) {
      this.flaggedIngredients.push('High-Fructose Corn Syrup');
    }
    
    if (preferences.maxCalories && typeof this.product.calories === 'number' && this.product.calories > preferences.maxCalories) {
      this.flaggedIngredients.push(`High calories (${this.product.calories})`);
    }

    // Also use parser's simple rules for broader coverage
    const parserFlagged = this.ingredientParser.evaluateIngredients(
      Array.isArray(this.product.ingredients) ? this.product.ingredients : [],
      preferences
    );
    parserFlagged.forEach((f) => {
      if (!this.flaggedIngredients.includes(f)) {
        this.flaggedIngredients.push(f);
      }
    });
    
    // Determine verdict
    this.verdict = this.flaggedIngredients.length === 0 ? 'good' : 'bad';
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
      flaggedIngredients: this.flaggedIngredients
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