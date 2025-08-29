import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProductDbService } from './product-db.service';
import { NotificationService } from './notification.service';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GamificationService {
  private unlockedBadges: Set<string> = new Set();
  private badgesSubject = new BehaviorSubject<Badge[]>([]);
  public badges$ = this.badgesSubject.asObservable();

  private allBadges: Omit<Badge, 'unlocked'>[] = [
    { id: 'first_scan', name: 'First Scan', description: 'Scan your very first product.', icon: '📸' },
    { id: 'five_scans', name: 'Scanner Pro', description: 'Scan 5 different products.', icon: '🔍' },
    { id: 'ten_scans', name: 'Expert Analyst', description: 'Scan 10 different products.', icon: '🔬' },
    { id: 'first_good_save', name: 'Healthy Choice', description: 'Save your first approved product.', icon: '💚' },
    { id: 'five_good_saves', name: 'Pantry Planner', description: 'Save 5 approved products.', icon: '🍎' },
    { id: 'first_contribution', name: 'Community Helper', description: 'Contribute a new product to the database.', icon: '🤝' },
    { id: 'natural_warrior', name: 'Natural Warrior', description: 'Scan 5 products with a "good" verdict.', icon: '🌿' }
  ];

  constructor(
    private productDb: ProductDbService,
    private notificationService: NotificationService
  ) {
    this.loadProgress();
    this.productDb.products$.subscribe(() => this.checkAndUnlockAchievements());
  }

  checkAndUnlockAchievements() {
    const scanHistory = JSON.parse(localStorage.getItem('fatBoyProducts') || '[]');
    const savedProducts = JSON.parse(localStorage.getItem('savedProducts') || '[]');
    const contributions = JSON.parse(localStorage.getItem('communityContributions') || '[]');
    let newAchievementUnlocked = false;

    // ... (achievement checking logic is unchanged)

    if (newAchievementUnlocked) {
      this.updateBadgesState();
      this.saveProgress();
    }
  }

  private unlockBadge(id: string) {
    if (this.unlockedBadges.has(id)) return;
    this.unlockedBadges.add(id);
    const badge = this.allBadges.find(b => b.id === id);
    if (badge) {
      this.notificationService.showSuccess(`You've unlocked the "${badge.name}" badge!`, '🏆 Achievement Unlocked!');
    }
  }

  private updateBadgesState() {
    const updatedBadges = this.allBadges.map(badge => ({
      ...badge,
      unlocked: this.unlockedBadges.has(badge.id)
    }));
    this.badgesSubject.next(updatedBadges);
  }

  private saveProgress() {
    localStorage.setItem('fatBoyUnlockedBadges', JSON.stringify(Array.from(this.unlockedBadges)));
  }

  private loadProgress() {
    const saved = localStorage.getItem('fatBoyUnlockedBadges');
    if (saved) {
      this.unlockedBadges = new Set(JSON.parse(saved));
    }
    this.updateBadgesState();
  }
}