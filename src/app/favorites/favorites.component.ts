import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductDbService, Product } from '../services/product-db.service';
import { Observable } from 'rxjs';
import { ShareService } from '../services/share.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ShoppingListService } from '../services/shopping-list.service';
import { AppModalService } from '../services/app-modal.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit {
  favorites$!: Observable<Product[]>;

  constructor(
    private productDb: ProductDbService,
    private shareService: ShareService,
    private shoppingListService: ShoppingListService,
    private appModalService: AppModalService
  ) {}

  ngOnInit() {
    this.favorites$ = this.productDb.favorites$;
  }

  isFavorite(productId: string): boolean {
    return this.productDb.isFavorite(productId);
  }

  toggleFavorite(productId: string) {
    this.productDb.toggleFavorite(productId);
  }

  shareProduct(product: Product) {
    this.shareService.shareProduct(product);
  }

  addToShoppingList(product: Product) {
    this.shoppingListService.addItem(product);
  }

  addToFoodDiary(product: Product) {
    this.appModalService.open(product);
  }
}