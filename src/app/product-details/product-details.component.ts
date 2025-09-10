import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Product, ProductDbService } from '../services/product-db.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { PreferencesService } from '../services/preferences.service';
import { NotificationService } from '../services/notification.service';
import { ShareService } from '../services/share.service';
import { ShoppingListService } from '../services/shopping-list.service';
import { AppModalService } from '../services/app-modal.service';
import { ButtonComponent } from '../button/button.component';
import { CustomTitleCasePipe } from '../shared/custom-title-case.pipe';
import { firstValueFrom } from 'rxjs';
import { SpeechService } from '../services/speech.service';
import { ConsoleCommandService } from '../services/console-command.service';
import { ProductCommentService, ProductComment } from '../services/product-comment.service';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TextareaComponent } from '../textarea/textarea.component';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonComponent, CustomTitleCasePipe, FormsModule, LucideAngularModule, TextareaComponent],
  templateUrl: './product-details.component.html',
  styleUrls: []
})
export class ProductDetailsComponent implements OnInit {
  product: Product | null = null;
  verdict: 'good' | 'bad' = 'bad';
  flaggedItems: { ingredient: string, reason: string }[] = [];
  comments: ProductComment[] = [];
  newCommentText: string = '';
  isLoadingComments = true;
  currentUserId: string | null = null;
  selectedTab: 'summary' | 'ingredients' | 'comments' | 'raw' = 'summary';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productDbService: ProductDbService,
    private ingredientParser: IngredientParserService,
    private preferencesService: PreferencesService,
    private notificationService: NotificationService,
    private shareService: ShareService,
    private shoppingListService: ShoppingListService,
    private appModalService: AppModalService,
    private speechService: SpeechService,
    private consoleCommandService: ConsoleCommandService,
    private productCommentService: ProductCommentService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.currentUserId = this.authService.getCurrentUserId() || null;
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      const lastViewed = this.productDbService.getLastViewedProduct();
      if (lastViewed && lastViewed.id === productId) {
        this.product = lastViewed;
      } else {
        this.product = await this.productDbService.getProductByClientSideId(productId);
      }

      if (this.product) {
        this.evaluateProduct();
        this.loadComments();
      } else {
        this.notificationService.showError('Product not found.', 'Error');
        this.router.navigate(['/history']);
      }
    } else {
      this.router.navigate(['/history']);
    }
  }

  private evaluateProduct(): void {
    if (!this.product) return;
    const preferences = this.preferencesService.getPreferences();
    const evaluation = this.ingredientParser.evaluateProduct(this.product.ingredients, this.product.calories, preferences);
    this.verdict = evaluation.verdict;
    this.flaggedItems = evaluation.flaggedIngredients;
  }

  async loadComments() {
    if (!this.product) return;
    this.isLoadingComments = true;
    this.comments = await this.productCommentService.getComments(this.product.id);
    this.isLoadingComments = false;
  }

  async postComment() {
    if (!this.product || !this.newCommentText.trim()) return;
    const newComment = await this.productCommentService.addComment(this.product.id, this.newCommentText);
    if (newComment) {
      this.comments.push(newComment);
      this.newCommentText = '';
    }
  }

  async deleteComment(commentId: string, index: number) {
    const success = await this.productCommentService.deleteComment(commentId);
    if (success) {
      this.comments.splice(index, 1);
    }
  }

  isIngredientFlagged(ingredient: string): boolean {
    return this.flaggedItems.some(fi => fi.ingredient.toLowerCase() === ingredient.toLowerCase());
  }

  addToList() {
    if (this.product) this.appModalService.open(this.product);
  }

  shareProduct() {
    if (this.product) this.shareService.shareProduct(this.product);
  }

  goBack(): void {
    this.router.navigate(['/history']);
  }

  scanAgain() {
    this.router.navigate(['/scanner']);
  }

  findAlternatives() {
    if (this.product) {
      const command = `Find healthier alternatives for "${this.product.name}" by ${this.product.brand}.`;
      this.consoleCommandService.setCommand(command);
      this.router.navigate(['/console']);
    }
  }

  selectTab(tab: 'summary' | 'ingredients' | 'comments' | 'raw') {
    this.selectedTab = tab;
  }
}