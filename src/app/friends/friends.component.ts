import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FriendsService, Friend, FriendRequest } from '../services/friends.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css']
})
export class FriendsComponent implements OnInit {
  friends: Friend[] = [];
  friendRequests: FriendRequest[] = [];
  searchQuery: string = '';
  isLoading = true;

  constructor(
    private friendsService: FriendsService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    this.friendRequests = await this.friendsService.getFriendRequests();
    this.friends = await this.friendsService.getFriends();
    this.isLoading = false;
  }

  async acceptRequest(requestId: number) {
    await this.friendsService.updateFriendRequest(requestId, 'accepted');
    this.notificationService.showSuccess('Friend request accepted!');
    this.loadData(); // Refresh the lists
  }

  async declineRequest(requestId: number) {
    await this.friendsService.removeFriendship(requestId);
    this.notificationService.showInfo('Friend request declined.');
    this.loadData(); // Refresh the lists
  }

  async removeFriend(friendshipId: number) {
    if (confirm('Are you sure you want to remove this friend?')) {
      await this.friendsService.removeFriendship(friendshipId);
      this.notificationService.showInfo('Friend removed.');
      this.loadData(); // Refresh the lists
    }
  }

  searchFriends() {
    // Placeholder for real search functionality
    this.notificationService.showInfo(`Searching for "${this.searchQuery}"... (Feature coming soon!)`);
  }
}