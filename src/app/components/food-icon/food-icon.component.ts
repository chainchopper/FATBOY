import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-food-icon',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="food-icon-container">
      <lucide-icon 
        [name]="getIconName(category)" 
        [size]="16" 
        class="food-icon"
      ></lucide-icon>
    </div>
  `,
  styles: [`
    .food-icon-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .food-icon {
      color: #a0a0c0;
    }
  `]
})
export class FoodIconComponent {
  @Input() category: string = 'default';

  getIconName(category: string): string {
    switch (category.toLowerCase()) {
      case 'fruit':
        return 'apple';
      case 'vegetable':
        return 'carrot';
      case 'dairy':
        return 'milk';
      case 'meat':
        return 'beef';
      case 'grain':
        return 'wheat';
      case 'snack':
        return 'cookie';
      case 'drink':
        return 'cup-soda';
      case 'seafood':
        return 'fish';
      case 'poultry':
        return 'bird';
      default:
        return 'help-circle';
    }
  }
}