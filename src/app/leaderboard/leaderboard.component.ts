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
  styleUrls: ['./leaderboard.component.css']
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
    });

    this.globalLeaderboard$ = from(this.leaderboardService.getGlobalLeaderboard()).pipe(
      map(leaderboard => leaderboard.map(entry => ({
        ...entry,
        isCurrentUser: entry.user_id === this.currentUserId
      })))
    );

    // Mock friends leaderboard (for now, just a subset of global)
    this.friendsLeaderboard$ = this.globalLeaderboard$.pipe(
      map(board => board.filter(entry => entry.rank <= 3 || entry.isCurrentUser))
    );
  }

  selectTab(tab: 'global' | 'friends') {
    this.selectedTab = tab;
  }
}