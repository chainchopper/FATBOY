import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductDbService, Product } from '../services/product-db.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ShareService } from '../services/share.service';
import { ProductCardComponent } from '../product-card.component'; // Import ProductCardComponent

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [CommonModule, ProductCardComponent], // Add ProductCardComponent
  templateUrl: './saved.component.html',
  styleUrls: ['./saved.component.css']
})
export class SavedComponent implements OnInit {
  approvedProducts$!: Observable<Product[]>;
  avoidedProducts$!: Observable<Product[]>;
  selectedTab: 'approved' | 'avoided' = 'approved';

  constructor(
    private productDb: ProductDbService,
    private shareService: ShareService
  ) {}

  ngOnInit() {
    // Note: The 'Saved' or 'Approved' list is currently the main scan history.
    // This can be evolved later to be a separate, curated list.
    this.approvedProducts$ = this.productDb.products$.pipe(
      map(products => products.filter(p => p.verdict === 'good'))
    );
    this.avoidedProducts$ = this.productDb.avoidedProducts$;
  }

  selectTab(tab: 'approved' | 'avoided') {
    this.selectedTab = tab;
  }

  removeApprovedProduct(id: string) {
    this.productDb.removeProduct(id);
  }

  removeAvoidedProduct(id: string) {
    this.productDb.removeAvoidedProduct(id);
  }

  shareProduct(product: Product) {
    this.shareService.shareProduct(product);
  }
}