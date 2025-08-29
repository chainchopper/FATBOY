import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-suggestions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './suggestions.component.html',
  styleUrls: ['./suggestions.component.css']
})
export class SuggestionsComponent implements OnInit {
  suggestions: any[] = [];
  isLoading = true;

  ngOnInit() {
    setTimeout(() => {
      this.suggestions = [];
      this.isLoading = false;
    }, 1000);
  }

  saveSuggestion(product: any) {
    const savedProducts = JSON.parse(localStorage.getItem('savedProducts') || '[]');
    savedProducts.push(product);
    localStorage.setItem('savedProducts', JSON.stringify(savedProducts));
    alert('Product saved to your list!');
  }

  getCategoryIcon(category: string): string {
    const icons: {[key: string]: string} = {
      artificialSweeteners: '🧪',
      artificialColors: '🎨',
      preservatives: '🧴',
      hfcs: '🌽',
      msg: '🍜',
      transFats: '🍔',
      natural: '🌿',
      allergens: '⚠️'
    };
    
    return icons[category] || '📋';
  }
}