import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductDbService, Product } from '../services/product-db.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './saved.component.html',
  styleUrls: ['./saved.component.css']
})
export class SavedComponent implements OnInit {
  savedProducts$!: Observable<Product[]>;

  constructor(private productDb: ProductDbService) {}

  ngOnInit() {
    this.savedProducts$ = this.productDb.products$.pipe(
      map(products => products.filter(p => p.verdict === 'good'))
    );
  }

  removeProduct(id: string) {
    this.productDb.removeProduct(id);
  }
}