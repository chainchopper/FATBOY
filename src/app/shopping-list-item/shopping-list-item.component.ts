import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingListItem } from '../services/shopping-list.service';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router'; // Import Router
import { ProductDbService } from '../services/product-db.service'; // Import ProductDbService

@Component({
  selector: 'app-shopping-list-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './shopping-list-item.component.html',
  styleUrls: []
})
export class ShoppingListItemComponent {
  @Input() item!: ShoppingListItem;
  @Output() togglePurchased = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() viewDetails = new EventEmitter<ShoppingListItem>(); // New output event

  constructor(private router: Router, private productDbService: ProductDbService) {} // Inject Router and ProductDbService

  onToggle() {
    this.togglePurchased.emit(this.item.id);
  }

  onRemove() {
    this.remove.emit(this.item.id);
  }

  onViewDetails() { // New method to emit viewDetails
    if (this.item.product) {
      this.productDbService.setLastViewedProduct(this.item.product); // Use ProductDbService
      this.router.navigate(['/products', this.item.product.id]); // Navigate to details page
    }
  }
}