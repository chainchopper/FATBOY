import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GamificationService } from '../services/gamification.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { CommunityService } from '../services/community.service';
import { Observable } from 'rxjs';
import { PreferencesService } from '../services/preferences.service';
import { AuthService } from '../services/auth.service';

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
  metadata: {
    goal?: string;
    rank?: number;
    score?: number;
  };
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
    private communityService: CommunityService,
    private preferencesService: PreferencesService,
    private authService: AuthService
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
    const prefs = this.preferencesService.getPreferences();
    const metadata: any = {};

    if (prefs.shareGoal) {
      metadata.goal = prefs.goal;
    }
    if (prefs.shareLeaderboardStatus) {
      const userId = this.authService.getCurrentUserId();
      if (userId) {
        const leaderboard = await this.leaderboardService.getGlobalLeaderboard();
        const userEntry = leaderboard.find(e => e.user_id === userId);
        if (userEntry) {
          metadata.rank = userEntry.rank;
          metadata.score = userEntry.score;
        }
      }
    }

    const contributionData = {
      ...this.newContribution,
      metadata
    };

    const savedContribution = await this.communityService.addContribution(contributionData);
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
        contribution.comments.push(newComment);
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