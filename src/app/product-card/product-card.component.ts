import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../services/product-db.service';
import { LucideAngularModule } from 'lucide-angular';
import { FoodIconComponent } from '../food-icon/food-icon.component';
import { CustomTitleCasePipe } from '../shared/custom-title-case.pipe';
import { ButtonComponent } from '../button/button.component';
import { ProductDbService } from '../services/product-db.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FoodIconComponent, CustomTitleCasePipe, ButtonComponent],
  templateUrl: './product-card.component.html',
  styleUrls: []
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

  constructor(private productDbService: ProductDbService, private router: Router) {}

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      this.productDbService.setLastViewedProduct(this.product);
      this.router.navigate(['/products', this.product.id]);
    }
  }

  onTogglePurchased() { this.togglePurchased.emit(this.product.id); }
  onRemove() { this.remove.emit(this.product.id); }
  onShare() { this.share.emit(this.product); }
  onAddToShoppingList() { this.addToShoppingList.emit(this.product); }
  onAddToFoodDiary() { this.addToFoodDiary.emit(this.product); }
  onToggleFavorite() { this.toggleFavorite.emit(this.product.id); }
  onViewDetailsClick() {
    this.productDbService.setLastViewedProduct(this.product);
    this.router.navigate(['/products', this.product.id]);
  }
}