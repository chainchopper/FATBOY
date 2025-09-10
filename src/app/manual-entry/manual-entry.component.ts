import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductDbService, Product } from '../services/product-db.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { NotificationService } from '../services/notification.service';
import { ModalService } from '../services/modal.service';
import { PreferencesService } from '../services/preferences.service';
import { AiIntegrationService } from '../services/ai-integration.service';
import { supabase } from '../../integrations/supabase/client';
import { InputComponent } from '../input.component'; // Correct import path
import { TextareaComponent } from '../textarea.component'; // Updated import path
import { ButtonComponent } from '../button.component'; // Correct import path
import { ProfileService } from '../services/profile.service'; // Import ProfileService for avatar upload utility

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
    private ingredientParser: IngredientParserService,
    private notificationService: NotificationService,
    private modalService: ModalService,
    private preferencesService: PreferencesService,
    private aiService: AiIntegrationService,
    private profileService: ProfileService // Inject ProfileService
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
    const preferences = this.preferencesService.getPreferences();
    
    const evaluation = this.ingredientParser.evaluateProduct(ingredientsArray, this.productData.calories || undefined, preferences);
    const categories = this.ingredientParser.categorizeProduct(ingredientsArray);

    let productImageUrl: string | undefined = 'https://via.placeholder.com/150?text=Manually+Added';

    // Upload image if provided
    if (this.imageFile) {
      this.notificationService.showInfo('Uploading product image...', 'Manual Entry');
      const uploadedUrl = await this.profileService.uploadAvatar(this.imageFile); // Reusing uploadAvatar for product images
      if (uploadedUrl) {
        productImageUrl = uploadedUrl;
        this.notificationService.showSuccess('Product image uploaded!', 'Manual Entry');
      } else {
        this.notificationService.showError('Failed to upload product image. Using default.', 'Manual Entry');
      }
    } else {
      // Try to find a better image using our Edge Function if no image was uploaded
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

    const newProduct: Omit<Product, 'id' | 'scanDate'> = {
      name: this.productData.name,
      brand: this.productData.brand,
      ingredients: ingredientsArray,
      calories: this.productData.calories || undefined,
      verdict: evaluation.verdict,
      flaggedIngredients: evaluation.flaggedIngredients.map(f => f.ingredient),
      categories: categories,
      image: productImageUrl
    };

    const savedProduct = await this.productDb.addProduct(newProduct);
    if (!savedProduct) return;

    this.productDb.setLastViewedProduct(savedProduct); // Use ProductDbService
    this.modalService.open(savedProduct);
    this.router.navigate(['/scanner']);
  }
}