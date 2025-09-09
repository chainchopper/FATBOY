import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../services/product-db.service';
import { LucideAngularModule } from 'lucide-angular';

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

  onRemove() {
    this.remove.emit(this.product.id);
  }
}