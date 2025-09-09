import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { GamificationService, Badge } from '../services/gamification.service';
import { ProfileService, Profile } from '../services/profile.service';
import { Observable, of, from } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { LeaderboardService, LeaderboardEntry } from '../services/leaderboard.service';
import { switchMap, map } from 'rxjs/operators';
import { RouterLink } from '@angular/router';

interface LeaderboardStats {
  rank: number | null;
  score: number | null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  currentUser$!: Observable<User | null>;
  userProfile$!: Observable<Profile | null>;
  badges$!: Observable<Badge[]>;
  leaderboardStats$!: Observable<LeaderboardStats>;

  constructor(
    private authService: AuthService,
    private gamificationService: GamificationService,
    private profileService: ProfileService,
    private leaderboardService: LeaderboardService
  ) {}

  ngOnInit() {
    this.currentUser$ = this.authService.currentUser$;
    this.badges$ = this.gamificationService.badges$;
    this.userProfile$ = this.profileService.getProfile();

    this.leaderboardStats$ = this.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return of({ rank: null, score: null });
        }
        return from(this.leaderboardService.getGlobalLeaderboard()).pipe(
          map((leaderboard: LeaderboardEntry[]) => {
            const userEntry = leaderboard.find(entry => entry.user_id === user.id);
            return {
              rank: userEntry ? userEntry.rank : null,
              score: userEntry ? userEntry.score : null
            };
          })
        );
      })
    );
  }
}