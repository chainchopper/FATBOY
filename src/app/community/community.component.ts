import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GamificationService } from '../services/gamification.service';
import { AuthService } from '../services/auth.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { ProfileService, Profile } from '../services/profile.service';
import { Observable, of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';

interface ContributionMetadata {
  username?: string;
  goal?: string;
  leaderboardStatus?: { rank: number; score: number };
}

interface CommunityContribution {
  productName: string;
  brand: string;
  ingredients: string;
  notes: string;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
  id: string;
  metadata: ContributionMetadata;
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.css']
})
export class CommunityComponent implements OnInit {
  mode: 'select' | 'manual' = 'select';
  scanHistory$!: Observable<Product[]>;
  isAddingNewProduct = false;
  communityContributions: CommunityContribution[] = [
    {
      id: '1',
      productName: 'Quantum Fizz Energy Drink',
      brand: 'CyberPop',
      ingredients: 'Carbonated Water, Citric Acid, Natural Flavors, Taurine, Caffeine',
      notes: 'Found this at the new cyber-mart downtown. Tastes like the future!',
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      status: 'approved',
      metadata: {
        username: 'NeonRunner',
        goal: 'avoidChemicals',
        leaderboardStatus: { rank: 12, score: 1250 }
      }
    },
    {
      id: '2',
      productName: 'Organic Soylent Green Bites',
      brand: 'EcoFoods Inc.',
      ingredients: 'Organic Soy Protein, Spirulina, Kale Powder, Sea Salt',
      notes: 'A bit earthy, but great for a quick, clean snack.',
      timestamp: new Date(Date.now() - 172800000), // 2 days ago
      status: 'approved',
      metadata: {
        username: 'EcoWarrior',
        goal: 'strictlyNatural',
        leaderboardStatus: { rank: 5, score: 2300 }
      }
    }
  ];
  
  newContribution = {
    productName: '',
    brand: '',
    ingredients: '',
    notes: ''
  };

  isSubmitted = false;
  private currentUserId: string | null = null;

  constructor(
    private gamificationService: GamificationService, 
    private authService: AuthService,
    private leaderboardService: LeaderboardService,
    private productDb: ProductDbService,
    private profileService: ProfileService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
    });
    this.scanHistory$ = this.productDb.products$;
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
      productName: product.name,
      brand: product.brand,
      ingredients: product.ingredients.join(', '),
      notes: ''
    };
    this.mode = 'manual';
  }

  async submitContribution() {
    const metadata = await this.buildMetadata();
    
    const contribution: CommunityContribution = {
      ...this.newContribution,
      id: Date.now().toString(),
      timestamp: new Date(),
      status: 'pending',
      metadata
    };

    this.communityContributions.unshift(contribution);
    
    this.isSubmitted = true;
    this.leaderboardService.incrementScore(50).subscribe();
    this.gamificationService.checkAndUnlockAchievements();

    setTimeout(() => {
      this.isSubmitted = false;
      this.toggleAddMode();
    }, 3000);
  }

  private async buildMetadata(): Promise<ContributionMetadata> {
    const preferences = JSON.parse(localStorage.getItem(this.getPrefsStorageKey()) || '{}');
    const metadata: ContributionMetadata = {};

    if (preferences.shareUsername) {
      const profile = await this.profileService.getProfile().pipe(take(1)).toPromise();
      metadata.username = `${profile?.first_name || 'Anonymous'} ${profile?.last_name || ''}`.trim();
    }

    if (preferences.shareGoal) {
      metadata.goal = preferences.goal;
    }

    if (preferences.shareLeaderboardStatus) {
      const board = await this.leaderboardService.getGlobalLeaderboard();
      const userEntry = board.find(e => e.user_id === this.currentUserId);
      if (userEntry) {
        metadata.leaderboardStatus = { rank: userEntry.rank, score: userEntry.score };
      }
    }
    
    return metadata;
  }

  private resetForm() {
    this.newContribution = {
      productName: '',
      brand: '',
      ingredients: '',
      notes: ''
    };
  }

  private getPrefsStorageKey(): string {
    return this.currentUserId ? `fatBoyPreferences_${this.currentUserId}` : 'fatBoyPreferences_anonymous';
  }
}