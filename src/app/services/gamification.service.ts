import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProductDbService } from './product-db.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { supabase } from '../../integrations/supabase/client';

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

  private currentUserId: string | null = null;

  constructor(
    private productDb: ProductDbService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadProgress(); // Reload data when user changes
    });
    this.productDb.products$.subscribe(() => this.checkAndUnlockAchievements());
  }

  checkAndUnlockAchievements() {
    const scanHistory = this.productDb.getProductsSnapshot();
    const savedProducts = scanHistory.filter(p => p.verdict === 'good');
    // Contributions need to be handled by the community service
    let newAchievementUnlocked = false;

    // Check scan-based achievements
    if (scanHistory.length >= 1 && !this.unlockedBadges.has('first_scan')) {
      this.unlockBadge('first_scan');
      newAchievementUnlocked = true;
    }
    if (scanHistory.length >= 5 && !this.unlockedBadges.has('five_scans')) {
      this.unlockBadge('five_scans');
      newAchievementUnlocked = true;
    }
    if (scanHistory.length >= 10 && !this.unlockedBadges.has('ten_scans')) {
      this.unlockBadge('ten_scans');
      newAchievementUnlocked = true;
    }
    if (scanHistory.filter((p: any) => p.verdict === 'good').length >= 5 && !this.unlockedBadges.has('natural_warrior')) {
      this.unlockBadge('natural_warrior');
      newAchievementUnlocked = true;
    }

    // Check save-based achievements
    if (savedProducts.length >= 1 && !this.unlockedBadges.has('first_good_save')) {
      this.unlockBadge('first_good_save');
      newAchievementUnlocked = true;
    }
    if (savedProducts.length >= 5 && !this.unlockedBadges.has('five_good_saves')) {
      this.unlockBadge('five_good_saves');
      newAchievementUnlocked = true;
    }

    if (newAchievementUnlocked) {
      this.updateBadgesState();
    }
  }

  private async unlockBadge(id: string) {
    if (this.unlockedBadges.has(id) || !this.currentUserId) return;
    
    const { error } = await supabase
      .from('user_badges')
      .insert({ user_id: this.currentUserId, badge_id: id });

    if (error) {
      console.error('Error unlocking badge:', error);
      return;
    }

    this.unlockedBadges.add(id);
    const badge = this.allBadges.find(b => b.id === id);
    if (badge) {
      this.notificationService.showSuccess(`You've unlocked the "${badge.name}" badge!`, '🏆 Achievement Unlocked!');
    }
    this.updateBadgesState();
  }

  private updateBadgesState() {
    const updatedBadges = this.allBadges.map(badge => ({
      ...badge,
      unlocked: this.unlockedBadges.has(badge.id)
    }));
    this.badgesSubject.next(updatedBadges);
  }

  private async loadProgress() {
    if (!this.currentUserId) {
      this.unlockedBadges = new Set();
      this.updateBadgesState();
      return;
    }

    const { data, error } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('Error loading badges:', error);
      this.unlockedBadges = new Set();
    } else {
      this.unlockedBadges = new Set(data.map(b => b.badge_id));
    }
    this.updateBadgesState();
  }
}