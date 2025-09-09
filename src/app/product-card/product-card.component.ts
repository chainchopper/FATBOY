import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common'; // Re-added CommonModule and TitleCasePipe
import { Product } from '../services/product-db.service';
import { LucideAngularModule } from 'lucide-angular';
import { FoodIconComponent } from '../food-icon/food-icon.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FoodIconComponent, TitleCasePipe], // Explicitly import both
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() showCheckbox: boolean = false;
  @Input() isPurchased: boolean = false;
  @Input() showRemoveButton: boolean = false;
  @Input() showShareButton: boolean = false;
  @Input() showAddToShoppingListButton: boolean = false;
  @Input() showAddToFoodDiaryButton: boolean = false;
  @Input() isFavorite: boolean = false;

  @Output() togglePurchased = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() share = new EventEmitter<Product>();
  @Output() addToShoppingList = new EventEmitter<Product>();
  @Output() addToFoodDiary = new EventEmitter<Product>();
  @Output() toggleFavorite = new EventEmitter<string>();
  @Output() viewDetails = new EventEmitter<Product>();

  isExpanded: boolean = false;

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      this.viewDetails.emit(this.product);
    }
  }

  onTogglePurchased() {
    this.togglePurchased.emit(this.product.id);
  }

  onRemove() {
    this.remove.emit(this.product.id);
  }

  onShare() {
    this.share.emit(this.product);
  }

  onAddToShoppingList() {
    this.addToShoppingList.emit(this.product);
  }

  onAddToFoodDiary() {
    this.addToFoodDiary.emit(this.product);
  }

  onToggleFavorite() {
    this.toggleFavorite.emit(this.product.id);
  }
}