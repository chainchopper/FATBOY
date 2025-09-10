import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductDbService, Product } from '../services/product-db.service';
import { NotificationService } from '../services/notification.service';
import { ModalService } from '../services/modal.service';
import { supabase } from '../../integrations/supabase/client';
import { InputComponent } from '../input.component';
import { TextareaComponent } from '../textarea.component';
import { ButtonComponent } from '../button.component';
import { ProfileService } from '../services/profile.service';
import { ProductManagerService } from '../services/product-manager.service';

@Component({
  selector: 'app-manual-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, TextareaComponent, ButtonComponent],
  templateUrl: './manual-entry.component.html',
  styleUrls: []
})
export class ManualEntryComponent {
  productData = {
    name: '',
    brand: '',
    ingredients: '',
    calories: null as number | null
  };
  imageFile: File | null = null;
  imageUrl: string | null = null;

  constructor(
    private router: Router,
    private productDb: ProductDbService,
    private notificationService: NotificationService,
    private modalService: ModalService,
    private profileService: ProfileService,
    private productManager: ProductManagerService
  ) {}

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.imageFile = fileList[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageUrl = e.target.result;
      };
      reader.readAsDataURL(this.imageFile);
    } else {
      this.imageFile = null;
      this.imageUrl = null;
    }
  }

  async submitProduct() {
    if (!this.productData.name || !this.productData.brand || !this.productData.ingredients) {
      this.notificationService.showError('Please fill out all required fields.');
      return;
    }

    const ingredientsArray = this.productData.ingredients.split(',').map(i => i.trim()).filter(i => i.length > 0);
    let productImageUrl: string | undefined = 'https://via.placeholder.com/150?text=Manually+Added';

    if (this.imageFile) {
      this.notificationService.showInfo('Uploading product image...', 'Manual Entry');
      const uploadedUrl = await this.profileService.uploadAvatar(this.imageFile);
      if (uploadedUrl) {
        productImageUrl = uploadedUrl;
        this.notificationService.showSuccess('Product image uploaded!', 'Manual Entry');
      } else {
        this.notificationService.showError('Failed to upload product image. Using default.', 'Manual Entry');
      }
    } else {
      this.notificationService.showInfo('Searching for a product image...', 'AI Assistant');
      const { data: productsData, error: functionError } = await supabase.functions.invoke('fetch-food-metadata', {
          body: { food_names: [`${this.productData.name} ${this.productData.brand}`] }
      });

      if (functionError) {
          console.warn('Could not fetch metadata for manually added product:', functionError);
      } else if (productsData && productsData[0]?.product?.image) {
          productImageUrl = productsData[0].product.image;
          this.notificationService.showSuccess('Found a matching product image!', 'AI Assistant');
      }
    }

    const partialProductData = {
      name: this.productData.name,
      brand: this.productData.brand,
      ingredients: ingredientsArray,
      calories: this.productData.calories || undefined,
      image: productImageUrl,
      source: 'manual' as const
    };

    const savedProduct = await this.productManager.processAndAddProduct(partialProductData);

    if (savedProduct) {
      this.modalService.open(savedProduct);
      this.router.navigate(['/scanner']);
    }
  }
}