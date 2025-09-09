import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProductDbService } from './product-db.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { supabase } from '../../integrations/supabase/client';
import { FriendsService } from './friends.service';
import { PreferencesService } from './preferences.service';
import { FoodDiaryService } from './food-diary.service';
import { ShoppingListService } from './shopping-list.service';
import { CommunityService } from './community.service';

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
    // Scanning Badges
    { id: 'first_scan', name: 'First Scan', description: 'Scan your very first product.', icon: '📸' },
    { id: 'five_scans', name: 'Scanner Pro', description: 'Scan 5 different products.', icon: '🔍' },
    { id: 'ten_scans', name: 'Expert Analyst', description: 'Scan 10 different products.', icon: '🔬' },
    { id: 'natural_warrior', name: 'Natural Warrior', description: 'Scan 5 products with a "good" verdict.', icon: '🌿' },
    // Action-based Badges
    { id: 'first_good_save', name: 'Healthy Choice', description: 'Add your first approved product to the shopping list.', icon: '💚' },
    { id: 'picky_eater', name: 'Picky Eater', description: 'Add your first custom ingredient to your avoid list.', icon: '✍️' },
    { id: 'meal_planner', name: 'Meal Planner', description: 'Log breakfast, lunch, and dinner in a single day.', icon: '📅' },
    // Community & Social Badges
    { id: 'first_contribution', name: 'Community Helper', description: 'Contribute a new product to the database.', icon: '🤝' },
    { id: 'top_contributor', name: 'Top Contributor', description: 'Contribute 5 products to the community database.', icon: '🌟' },
    { id: 'social_butterfly', name: 'Social Butterfly', description: 'Add your first friend.', icon: '🦋' },
  ];

  private currentUserId: string | null = null;

  constructor(
    private productDb: ProductDbService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private friendsService: FriendsService,
    private preferencesService: PreferencesService,
    private foodDiaryService: FoodDiaryService,
    private shoppingListService: ShoppingListService,
    private communityService: CommunityService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadProgress();
    });
  }

  async checkAndUnlockAchievements() {
    if (!this.currentUserId) return;

    // --- Data Gathering from Services (No localStorage) ---
    const scanHistory = this.productDb.getProductsSnapshot();
    const shoppingList = this.shoppingListService.getListSnapshot();
    const preferences = this.preferencesService.getPreferences();
    const friends = await this.friendsService.getFriends();
    const myContributions = await this.communityService.getMyContributions();
    const today = new Date().toISOString().split('T')[0];
    const todayDiaryEntries = this.foodDiaryService.getEntriesForDate(today);

    // --- Achievement Logic ---
    const unlockPromises: Promise<boolean>[] = [];

    // Scan-based
    if (scanHistory.length >= 1) unlockPromises.push(this.unlockBadge('first_scan'));
    if (scanHistory.length >= 5) unlockPromises.push(this.unlockBadge('five_scans'));
    if (scanHistory.length >= 10) unlockPromises.push(this.unlockBadge('ten_scans'));
    if (scanHistory.filter(p => p.verdict === 'good').length >= 5) unlockPromises.push(this.unlockBadge('natural_warrior'));

    // Action-based
    const goodItemsInShoppingList = shoppingList.filter(item => item.product?.verdict === 'good').length;
    if (goodItemsInShoppingList >= 1) unlockPromises.push(this.unlockBadge('first_good_save'));

    if (preferences.customAvoidedIngredients.length >= 1) unlockPromises.push(this.unlockBadge('picky_eater'));

    const hasBreakfast = todayDiaryEntries.some(e => e.meal === 'Breakfast');
    const hasLunch = todayDiaryEntries.some(e => e.meal === 'Lunch');
    const hasDinner = todayDiaryEntries.some(e => e.meal === 'Dinner');
    if (hasBreakfast && hasLunch && hasDinner) unlockPromises.push(this.unlockBadge('meal_planner'));

    // Social & Community
    if (myContributions.length >= 1) unlockPromises.push(this.unlockBadge('first_contribution'));
    if (myContributions.length >= 5) unlockPromises.push(this.unlockBadge('top_contributor'));
    if (friends.length >= 1) unlockPromises.push(this.unlockBadge('social_butterfly'));

    const results = await Promise.all(unlockPromises);
    const newAchievementUnlocked = results.some(result => result === true);

    if (newAchievementUnlocked) {
      this.updateBadgesState();
    }
  }

  private async unlockBadge(id: string): Promise<boolean> {
    if (this.unlockedBadges.has(id) || !this.currentUserId) return false;
    
    const { error } = await supabase
      .from('fatboy_user_badges')
      .insert({ user_id: this.currentUserId, badge_id: id });

    if (error) {
      if (error.code !== '23505') {
        console.error('Error unlocking badge:', error);
      }
      return false;
    }

    this.unlockedBadges.add(id);
    const badge = this.allBadges.find(b => b.id === id);
    if (badge) {
      supabase.rpc('log_user_activity', { 
        activity_type: 'achievement', 
        activity_description: `Unlocked the "${badge.name}" badge! 🏆` 
      }).then();
      this.notificationService.showSuccess(`You've unlocked the "${badge.name}" badge!`, '🏆 Achievement Unlocked!');
    }
    return true;
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
      .from('fatboy_user_badges')
      .select('badge_id')
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('Error loading badges:', error);
      this.unlockedBadges = new Set();
    } else {
      this.unlockedBadges = new Set(data.map(b => b.badge_id));
    }
    this.updateBadgesState();
    this.checkAndUnlockAchievements(); // Initial check after loading
  }

  async getBadgesForUser(userId: string): Promise<Badge[]> {
    const { data, error } = await supabase
      .from('fatboy_user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    if (error) {
      console.error(`Error loading badges for user ${userId}:`, error);
      return this.allBadges.map(b => ({ ...b, unlocked: false }));
    }

    const unlockedIds = new Set(data.map(b => b.badge_id));
    return this.allBadges.map(badge => ({
      ...badge,
      unlocked: unlockedIds.has(badge.id)
    }));
  }
}