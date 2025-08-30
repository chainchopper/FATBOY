import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { GamificationService, Badge } from '../services/gamification.service';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { User } from '@supabase/supabase-js';

interface Profile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  currentUser$!: Observable<User | null>;
  userProfile$!: Observable<Profile | null>;
  badges$!: Observable<Badge[]>;

  constructor(
    private authService: AuthService,
    private gamificationService: GamificationService
  ) {}

  ngOnInit() {
    this.currentUser$ = this.authService.currentUser$;
    this.badges$ = this.gamificationService.badges$;

    this.userProfile$ = this.currentUser$.pipe(
      switchMap(user => {
        if (user) {
          // In a real app, you'd fetch the profile from Supabase here
          // For now, we'll use placeholders or data from user.user_metadata
          return of({
            first_name: user.user_metadata['first_name'] || 'Guest',
            last_name: user.user_metadata['last_name'] || 'User',
            avatar_url: user.user_metadata['avatar_url'] || 'https://via.placeholder.com/150'
          });
        }
        return of(null);
      })
    );
  }
}