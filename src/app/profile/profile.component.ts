import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { GamificationService, Badge } from '../services/gamification.service';
import { ProfileService, Profile } from '../services/profile.service';
import { Observable, of, from } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { LeaderboardService, LeaderboardStats } from '../services/leaderboard.service';
import { switchMap, map } from 'rxjs/operators';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profile$!: Observable<Profile | null>;
  badges$!: Observable<Badge[]>;
  leaderboardStats$!: Observable<LeaderboardStats>;
  isCurrentUserProfile: boolean = false;
  viewedUserId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private gamificationService: GamificationService,
    private leaderboardService: LeaderboardService
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
      }
    });
  }
}