import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AiAnalysisService, ProductAnalysis } from '../services/ai-analysis.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit {
  product: any;
  analysis: ProductAnalysis | null = null;
  insightSummary: string = '';

  constructor(
    private router: Router,
    private aiAnalysis: AiAnalysisService
  ) {}

  ngOnInit() {
    const productData = sessionStorage.getItem('scannedProduct');
    if (productData) {
      this.product = JSON.parse(productData);
      this.analysis = this.aiAnalysis.analyzeProduct(this.product);
      this.insightSummary = this.aiAnalysis.generateInsightSummary(this.analysis, this.product);
    } else {
      this.router.navigate(['/scanner']);
    }
  }

  saveProduct() {
    const savedProducts = JSON.parse(localStorage.getItem('savedProducts') || '[]');
    savedProducts.push({
      ...this.product,
      analysis: this.analysis
    });
    localStorage.setItem('savedProducts', JSON.stringify(savedProducts));
    alert('Product saved!');
  }

  scanAgain() {
    this.router.navigate(['/scanner']);
  }

  getNutritionalScoreColor(score: number): string {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    return '#F44336';
  }
}