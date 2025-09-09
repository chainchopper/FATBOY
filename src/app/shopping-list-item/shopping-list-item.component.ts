import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingListItem } from '../services/shopping-list.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-shopping-list-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './shopping-list-item.component.html',
  styleUrls: ['./shopping-list-item.component.css']
})
export class ShoppingListItemComponent {
  @Input() item!: ShoppingListItem;
  @Output() togglePurchased = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() viewDetails = new EventEmitter<ShoppingListItem>(); // New output event

  onToggle() {
    this.togglePurchased.emit(this.item.id);
  }

  onRemove() {
    this.remove.emit(this.item.id);
  }

  onViewDetails() { // New method to emit viewDetails
    this.viewDetails.emit(this.item);
  }
}