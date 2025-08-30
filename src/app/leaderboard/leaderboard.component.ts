import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  avatar_url: string;
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
  globalLeaderboard$: Observable<LeaderboardEntry[]> = of([]);
  friendsLeaderboard$: Observable<LeaderboardEntry[]> = of([]);
  currentUserEntry$: Observable<LeaderboardEntry | null> = of(null);
  selectedTab: 'global' | 'friends' = 'global';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Mock data for now, will be replaced by Supabase/backend calls
    this.globalLeaderboard$ = this.authService.currentUser$.pipe(
      map(user => {
        const mockData: LeaderboardEntry[] = [
          { rank: 1, username: 'HealthGuru', score: 1250, avatar_url: 'https://via.placeholder.com/40/0abdc6/1a1a2e?text=HG', isCurrentUser: false },
          { rank: 2, username: 'CleanEater', score: 1180, avatar_url: 'https://via.placeholder.com/40/f038ff/1a1a2e?text=CE', isCurrentUser: false },
          { rank: 3, username: 'FatBoyFan', score: 1020, avatar_url: 'https://via.placeholder.com/40/e0e0e0/1a1a2e?text=FF', isCurrentUser: false },
          { rank: 4, username: 'GreenMachine', score: 980, avatar_url: 'https://via.placeholder.com/40/0abdc6/1a1a2e?text=GM', isCurrentUser: false },
          { rank: 5, username: 'NutriNerd', score: 910, avatar_url: 'https://via.placeholder.com/40/f038ff/1a1a2e?text=NN', isCurrentUser: false },
        ];
        if (user) {
          const userScore = 950; // Placeholder for actual user score
          const userEntry: LeaderboardEntry = {
            rank: 0, // Will be determined by sorting
            username: user.user_metadata['first_name'] || user.email?.split('@')[0] || 'You',
            score: userScore,
            avatar_url: user.user_metadata['avatar_url'] || 'https://via.placeholder.com/40/e0e0e0/1a1a2e?text=U',
            isCurrentUser: true
          };
          const combined = [...mockData, userEntry].sort((a, b) => b.score - a.score);
          return combined.map((entry, index) => ({ ...entry, rank: index + 1 }));
        }
        return mockData;
      })
    );

    this.currentUserEntry$ = this.globalLeaderboard$.pipe(
      map(board => board.find(entry => entry.isCurrentUser) || null)
    );

    // Mock friends leaderboard (for now, just a subset of global)
    this.friendsLeaderboard$ = this.globalLeaderboard$.pipe(
      map(board => board.filter(entry => entry.rank <= 3 || entry.isCurrentUser)) // Example: top 3 + user
    );
  }

  selectTab(tab: 'global' | 'friends') {
    this.selectedTab = tab;
  }
}