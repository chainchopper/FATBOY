import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { LeaderboardService, LeaderboardEntry } from '../services/leaderboard.service';
import { Observable, from, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface LeaderboardViewEntry extends LeaderboardEntry {
  isCurrentUser: boolean;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: []
})
export class LeaderboardComponent implements OnInit {
  globalLeaderboard$!: Observable<LeaderboardViewEntry[]>;
  friendsLeaderboard$!: Observable<LeaderboardViewEntry[]>;
  selectedTab: 'global' | 'friends' = 'global';
  private currentUserId: string | null = null;

  constructor(
    private authService: AuthService,
    private leaderboardService: LeaderboardService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      // Refresh leaderboards when user context is available
      this.loadLeaderboards();
    });
  }

  loadLeaderboards() {
    this.globalLeaderboard$ = from(this.leaderboardService.getGlobalLeaderboard()).pipe(
      map(leaderboard => leaderboard.map(entry => ({
        ...entry,
        isCurrentUser: entry.user_id === this.currentUserId
      })))
    );

    this.friendsLeaderboard$ = from(this.leaderboardService.getFriendsLeaderboard()).pipe(
      map(leaderboard => leaderboard.map(entry => ({
        ...entry,
        isCurrentUser: entry.user_id === this.currentUserId
      })))
    );
  }

  selectTab(tab: 'global' | 'friends') {
    this.selectedTab = tab;
  }
}