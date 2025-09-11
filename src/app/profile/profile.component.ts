import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe, DatePipe } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { GamificationService, Badge } from '../services/gamification.service';
import { ProfileService, Profile } from '../services/profile.service';
import { Observable, of, from } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { LeaderboardService, LeaderboardStats } from '../services/leaderboard.service';
import { switchMap, map } from 'rxjs/operators';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CommunityService } from '../services/community.service';
import { FriendsService, ActivityFeedItem, FriendshipStatus } from '../services/friends.service';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent } from '../button/button.component';
import { NotificationService } from '../services/notification.service';
import { ActivityFeedComponent } from '../activity-feed/activity-feed.component';

export interface Contribution {
  id: string;
  product_name: string;
  brand: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, TitleCasePipe, DatePipe, LucideAngularModule, ButtonComponent, ActivityFeedComponent],
  templateUrl: './profile.component.html',
  styleUrls: []
})
export class ProfileComponent implements OnInit {
  profile$!: Observable<Profile | null>;
  badges$!: Observable<Badge[]>;
  leaderboardStats$!: Observable<LeaderboardStats>;
  contributions$!: Observable<Contribution[]>;
  activityFeed$!: Observable<ActivityFeedItem[]>;
  isCurrentUserProfile: boolean = false;
  viewedUserId: string | null = null;
  friendshipStatus: FriendshipStatus = 'not_friends';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private gamificationService: GamificationService,
    private leaderboardService: LeaderboardService,
    private communityService: CommunityService,
    private friendsService: FriendsService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const userIdFromRoute = params.get('id');
      const currentUserId = this.authService.getCurrentUserId();

      this.viewedUserId = userIdFromRoute || currentUserId || null;
      this.isCurrentUserProfile = !!this.viewedUserId && this.viewedUserId === currentUserId;

      if (this.viewedUserId) {
        this.profile$ = this.profileService.getProfileById(this.viewedUserId);
        this.leaderboardStats$ = from(this.leaderboardService.getUserStats(this.viewedUserId));
        this.badges$ = from(this.gamificationService.getBadgesForUser(this.viewedUserId));
        this.contributions$ = from(this.communityService.getContributionsByUserId(this.viewedUserId) as Promise<Contribution[]>);
        this.activityFeed$ = from(this.friendsService.getUserActivity(this.viewedUserId));
        if (!this.isCurrentUserProfile) {
          this.loadFriendshipStatus();
        }
      }
    });
  }

  async loadFriendshipStatus() {
    if (!this.viewedUserId) return;
    this.friendshipStatus = await this.friendsService.getFriendshipStatus(this.viewedUserId);
  }

  async addFriend() {
    if (!this.viewedUserId) return;
    const result = await this.friendsService.sendFriendRequest(this.viewedUserId);
    if (result) {
      this.notificationService.showSuccess('Friend request sent!');
      this.friendshipStatus = 'pending_sent';
    } else {
      this.notificationService.showError('Failed to send friend request.');
    }
  }

  getIconForActivity(type: string): string {
    switch (type) {
      case 'scan': return 'camera';
      case 'community': return 'users';
      case 'shopping_list': return 'shopping-cart';
      case 'achievement': return 'award';
      case 'friendship': return 'user-plus';
      case 'food_diary': return 'book-open';
      default: return 'activity';
    }
  }
}