import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FriendsService, Friend, FriendRequest, Profile, ActivityFeedItem } from '../services/friends.service';
import { NotificationService } from '../services/notification.service';
import { AppModalService } from '../services/app-modal.service';
import { GamificationService } from '../services/gamification.service';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent } from '../button/button.component';
import { ActivityFeedComponent } from '../activity-feed/activity-feed.component';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, DatePipe, ButtonComponent, ActivityFeedComponent],
  templateUrl: './friends.component.html',
  styleUrls: []
})
export class FriendsComponent implements OnInit {
  friends: Friend[] = [];
  friendRequests: FriendRequest[] = [];
  searchResults: Profile[] = [];
  activityFeed: ActivityFeedItem[] = [];
  searchQuery: string = '';
  isLoading = true;
  isSearching = false;

  constructor(
    private friendsService: FriendsService,
    private notificationService: NotificationService,
    private appModalService: AppModalService,
    private gamificationService: GamificationService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    this.friendRequests = await this.friendsService.getFriendRequests();
    this.friends = await this.friendsService.getFriends();
    this.activityFeed = await this.friendsService.getFriendActivity();
    this.isLoading = false;
  }

  async acceptRequest(requestId: number) {
    await this.friendsService.updateFriendRequest(requestId, 'accepted');
    this.notificationService.showSuccess('Friend request accepted!');
    this.loadData();
    this.gamificationService.checkAndUnlockAchievements();
  }

  async declineRequest(requestId: number) {
    await this.friendsService.removeFriendship(requestId);
    this.notificationService.showInfo('Friend request declined.');
    this.loadData();
  }

  async removeFriend(friendshipId: number) {
    this.appModalService.openConfirmation({
      title: 'Remove Friend?',
      message: 'Are you sure you want to remove this friend? This action cannot be undone.',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await this.friendsService.removeFriendship(friendshipId);
        this.notificationService.showInfo('Friend removed.');
        this.loadData();
      }
    });
  }

  async searchFriends() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }
    this.isSearching = true;
    this.searchResults = await this.friendsService.searchUsers(this.searchQuery);
    this.isSearching = false;
  }

  async sendRequest(addresseeId: string) {
    const result = await this.friendsService.sendFriendRequest(addresseeId);
    if (result) {
      this.notificationService.showSuccess('Friend request sent!');
      this.searchResults = this.searchResults.filter(user => user.id !== addresseeId);
    } else {
      this.notificationService.showError('Failed to send friend request.');
    }
  }
}