import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductDbService, Product } from '../services/product-db.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { NotificationService } from '../services/notification.service';
import { ModalService } from '../services/modal.service';
import { PreferencesService } from '../services/preferences.service';
import { AiIntegrationService } from '../services/ai-integration.service'; // Import AiIntegrationService

@Component({
  selector: 'app-manual-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manual-entry.component.html',
  styleUrls: ['./manual-entry.component.css']
})
export class ManualEntryComponent {
  productData = {
    name: '',
    brand: '',
    ingredients: '',
    calories: null as number | null
  };

  constructor(
    private router: Router,
    private productDb: ProductDbService,
    private ingredientParser: IngredientParserService,
    private notificationService: NotificationService,
    private modalService: ModalService,
    private preferencesService: PreferencesService,
    private aiService: AiIntegrationService // Inject AiIntegrationService
  ) {}

  submitProduct() {
    if (!this.productData.name || !this.productData.brand || !this.productData.ingredients) {
      this.notificationService.showError('Please fill out all required fields.');
      return;
    }

    const ingredientsArray = this.productData.ingredients.split(',').map(i => i.trim()).filter(i => i.length > 0);
    const preferences = this.preferencesService.getPreferences();
    
    const evaluation = this.ingredientParser.evaluateProduct(ingredientsArray, this.productData.calories || undefined, preferences);
    const categories = this.ingredientParser.categorizeProduct(ingredientsArray);

    const newProduct: Omit<Product, 'id' | 'scanDate'> = {
      name: this.productData.name,
      brand: this.productData.brand,
      ingredients: ingredientsArray,
      calories: this.productData.calories || undefined,
      verdict: evaluation.verdict,
      flaggedIngredients: evaluation.flaggedIngredients.map(f => f.ingredient),
      categories: categories,
      image: 'https://via.placeholder.com/150?text=Manually+Added'
    };

    const savedProduct = this.productDb.addProduct(newProduct);

    this.aiService.setLastDiscussedProduct(savedProduct); // Set last discussed product
    // Open the modal with the new product and then navigate home
    this.modalService.open(savedProduct);
    this.router.navigate(['/scanner']);
  }
}