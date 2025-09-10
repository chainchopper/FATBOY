import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-food-icon',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './food-icon.component.html',
  styleUrls: []
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