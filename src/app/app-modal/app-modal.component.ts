import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppModalService } from '../services/app-modal.service';
import { Product } from '../services/product-db.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { FoodDiaryService, MealType } from '../services/food-diary.service';
import { ProductDbService } from '../services/product-db.service';
import { NotificationService } from '../services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-modal.component.html',
  styleUrls: ['./app-modal.component.css']
})
export class AppModalComponent implements OnInit {
  display$!: Observable<'open' | 'closed'>;
  product$!: Observable<Product | null>;
  currentProduct: Product | null = null;
  showMealOptions = false;

  modalTitle: string = '';
  modalMessage: string = '';
  confirmButtonText: string = 'Confirm';
  cancelButtonText: string = 'Cancel';
  onConfirm: (() => void) | null | undefined = null;
  onCancel: (() => void) | null | undefined = null;
  isConfirmation: boolean = false;

  constructor(
    private appModalService: AppModalService,
    private shoppingListService: ShoppingListService,
    private foodDiaryService: FoodDiaryService,
    private productDbService: ProductDbService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.display$ = this.appModalService.watch();
    this.product$ = this.appModalService.watchProduct();
    this.product$.subscribe(product => this.currentProduct = product);

    this.appModalService.watchConfirmationData().subscribe(data => {
      if (data) {
        this.modalTitle = data.title;
        this.modalMessage = data.message;
        this.confirmButtonText = data.confirmText || 'Confirm';
        this.cancelButtonText = data.cancelText || 'Cancel';
        this.onConfirm = data.onConfirm;
        this.onCancel = data.onCancel;
        this.isConfirmation = true;
      } else {
        this.isConfirmation = false;
      }
    });
  }

  close() {
    this.appModalService.close();
    this.showMealOptions = false;
    this.isConfirmation = false;
  }

  handleConfirm() {
    if (this.onConfirm) {
      this.onConfirm();
    }
    this.close();
  }

  handleCancel() {
    if (this.onCancel) {
      this.onCancel();
    }
    this.close();
  }

  addToShoppingList() {
    if (this.currentProduct) {
      this.shoppingListService.addItem(this.currentProduct);
    }
    this.close();
  }

  saveToApproved() {
    if (this.currentProduct) {
      this.notificationService.showSuccess(`${this.currentProduct.name} saved to your approved list!`);
    }
    this.close();
  }

  async addToAvoidList() {
    if (this.currentProduct) {
      const addedProduct = await this.productDbService.addAvoidedProduct(this.currentProduct);
      if (addedProduct) {
        this.notificationService.showInfo(`${addedProduct.name} added to your avoid list.`);
      }
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