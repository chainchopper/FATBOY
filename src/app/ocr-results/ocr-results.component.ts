import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Product } from '../services/product-db.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { AudioService } from '../services/audio.service';

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
  flaggedItems: { ingredient: string, reason: string }[] = [];

  constructor(
    private router: Router,
    private ingredientParser: IngredientParserService,
    private audioService: AudioService
  ) {}

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

    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');
    const evaluation = this.ingredientParser.evaluateProduct(this.product.ingredients, this.product.calories, preferences);

    this.verdict = evaluation.verdict;
    this.flaggedItems = evaluation.flaggedIngredients;

    if (this.verdict === 'good') {
      this.audioService.playSuccessSound();
    } else {
      this.audioService.playErrorSound();
    }
  }

  isIngredientFlagged(ingredient: string): boolean {
    return this.flaggedItems.some(fi => fi.ingredient.toLowerCase() === ingredient.toLowerCase());
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