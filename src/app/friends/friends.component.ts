import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Friend {
  id: string;
  name: string;
  avatarUrl: string;
  rank: number;
  isOnline: boolean;
}

interface FriendRequest {
  id: string;
  name: string;
  avatarUrl: string;
  mutualFriends: number;
}

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

  ngOnInit() {
    this.loadMockData();
  }

  loadMockData() {
    this.friends = [
      { id: '1', name: 'NeonRunner', avatarUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=neon', rank: 12, isOnline: true },
      { id: '2', name: 'EcoWarrior', avatarUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=eco', rank: 5, isOnline: false },
      { id: '3', name: 'CyberChef', avatarUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=chef', rank: 23, isOnline: true },
    ];

    this.friendRequests = [
      { id: '4', name: 'DataDiver', avatarUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=data', mutualFriends: 2 },
    ];
  }

  acceptRequest(requestId: string) {
    const request = this.friendRequests.find(r => r.id === requestId);
    if (request) {
      this.friends.push({
        id: request.id,
        name: request.name,
        avatarUrl: request.avatarUrl,
        rank: 100, // Placeholder rank
        isOnline: true
      });
      this.friendRequests = this.friendRequests.filter(r => r.id !== requestId);
    }
  }

  declineRequest(requestId: string) {
    this.friendRequests = this.friendRequests.filter(r => r.id !== requestId);
  }

  removeFriend(friendId: string) {
    if (confirm('Are you sure you want to remove this friend?')) {
      this.friends = this.friends.filter(f => f.id !== friendId);
    }
  }

  searchFriends() {
    // Placeholder for real search functionality
    console.log('Searching for:', this.searchQuery);
  }
}