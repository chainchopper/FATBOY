import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../services/modal.service';
import { Product } from '../services/product-db.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { FoodDiaryService, MealType } from '../services/food-diary.service';
import { ProductDbService } from '../services/product-db.service';
import { NotificationService } from '../services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-add-to-list-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-to-list-modal.component.html',
  styleUrls: ['./add-to-list-modal.component.css']
})
export class AddToListModalComponent implements OnInit {
  display$!: Observable<'open' | 'closed'>;
  product$!: Observable<Product | null>;
  currentProduct: Product | null = null;
  showMealOptions = false;

  constructor(
    private modalService: ModalService,
    private shoppingListService: ShoppingListService,
    private foodDiaryService: FoodDiaryService,
    private productDbService: ProductDbService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.display$ = this.modalService.watch();
    this.product$ = this.modalService.watchProduct();
    this.product$.subscribe(product => this.currentProduct = product);
  }

  close() {
    this.modalService.close();
    this.showMealOptions = false;
  }

  addToShoppingList() {
    if (this.currentProduct) {
      this.shoppingListService.addItem(this.currentProduct);
    }
    this.close();
  }

  saveToApproved() {
    if (this.currentProduct) {
      // This assumes saving is handled by adding to the main product list with a 'good' verdict
      this.notificationService.showSuccess(`${this.currentProduct.name} saved to your approved list!`);
    }
    this.close();
  }

  addToAvoidList() {
    if (this.currentProduct) {
      this.productDbService.addAvoidedProduct(this.currentProduct);
      this.notificationService.showInfo(`${this.currentProduct.name} added to your avoid list.`);
    }
    this.close();
  }

  toggleMealOptions() {
    this.showMealOptions = !this.showMealOptions;
  }

  addToDiary(meal: MealType) {
    if (this.currentProduct) {
      this.foodDiaryService.addEntry(this.currentProduct, meal);
    }
    this.close();
  }
}