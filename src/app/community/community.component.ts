import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GamificationService } from '../services/gamification.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { CommunityService } from '../services/community.service';
import { Observable } from 'rxjs';

// Define interfaces for our data structures
interface CommunityContribution {
  id: string;
  product_name: string;
  brand: string;
  ingredients: string;
  notes: string;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
  likes: number;
  profile: { first_name: string, last_name: string, avatar_url: string };
  comments: any[];
  metadata: any; // Keeping metadata for potential future use
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.css']
})
export class CommunityComponent implements OnInit {
  mode: 'select' | 'manual' = 'select';
  scanHistory$!: Observable<Product[]>;
  isAddingNewProduct = false;
  communityContributions: CommunityContribution[] = [];
  newCommentText: { [key: string]: string } = {};
  
  newContribution = {
    product_name: '',
    brand: '',
    ingredients: '',
    notes: ''
  };

  isSubmitted = false;

  constructor(
    private gamificationService: GamificationService, 
    private leaderboardService: LeaderboardService,
    private productDb: ProductDbService,
    private communityService: CommunityService
  ) {}

  ngOnInit() {
    this.scanHistory$ = this.productDb.products$;
    this.loadContributions();
  }

  async loadContributions() {
    this.communityContributions = await this.communityService.getContributions() as any;
  }

  toggleAddMode() {
    this.isAddingNewProduct = !this.isAddingNewProduct;
    if (!this.isAddingNewProduct) {
      this.resetForm();
    }
  }

  setMode(mode: 'select' | 'manual') {
    this.mode = mode;
  }

  selectProduct(product: Product) {
    this.newContribution = {
      product_name: product.name,
      brand: product.brand,
      ingredients: product.ingredients.join(', '),
      notes: ''
    };
    this.mode = 'manual';
  }

  async submitContribution() {
    const savedContribution = await this.communityService.addContribution(this.newContribution);
    if (savedContribution) {
      this.isSubmitted = true;
      this.leaderboardService.incrementScore(50).subscribe();
      this.gamificationService.checkAndUnlockAchievements();
      setTimeout(() => {
        this.isSubmitted = false;
        this.toggleAddMode();
        this.loadContributions(); // Refresh the feed
      }, 3000);
    }
  }

  async toggleLike(contribution: CommunityContribution) {
    contribution.likes++; // Optimistic update
    await this.communityService.addLike(contribution.id, contribution.likes - 1);
  }

  async addComment(contributionId: string) {
    const commentText = this.newCommentText[contributionId]?.trim();
    if (!commentText) return;

    const newComment = await this.communityService.addComment(contributionId, commentText);
    if (newComment) {
      const contribution = this.communityContributions.find(c => c.id === contributionId);
      if (contribution) {
        // Add the profile data to the new comment for immediate display
        const newCommentWithProfile = {
          ...newComment,
          username: `${newComment.profile.first_name || 'User'}`
        };
        contribution.comments.push(newCommentWithProfile);
      }
      this.newCommentText[contributionId] = '';
    }
  }

  private resetForm() {
    this.newContribution = {
      product_name: '',
      brand: '',
      ingredients: '',
      notes: ''
    };
  }
}