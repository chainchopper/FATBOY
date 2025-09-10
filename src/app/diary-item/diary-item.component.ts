import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../services/product-db.service';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router'; // Import Router
import { ProductDbService } from '../services/product-db.service'; // Import ProductDbService

@Component({
  selector: 'app-diary-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './diary-item.component.html',
  styleUrls: ['./diary-item.component.css']
})
export class DiaryItemComponent {
  @Input() product!: Product;
  @Output() remove = new EventEmitter<string>();
  @Output() viewDetails = new EventEmitter<Product>(); // New output event

  constructor(private router: Router, private productDbService: ProductDbService) {} // Inject Router and ProductDbService

  onRemove() {
    this.remove.emit(this.product.id);
  }

  onViewDetails() { // New method to emit viewDetails
    this.productDbService.setLastViewedProduct(this.product); // Use ProductDbService
    this.router.navigate(['/products', this.product.id]); // Navigate to details page
  }
}