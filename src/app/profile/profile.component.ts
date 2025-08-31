import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { GamificationService, Badge } from '../services/gamification.service';
import { ProfileService, Profile } from '../services/profile.service';
import { Observable } from 'rxjs';
import { User } from '@supabase/supabase-js';

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
    private gamificationService: GamificationService,
    private profileService: ProfileService
  ) {}

  ngOnInit() {
    this.currentUser$ = this.authService.currentUser$;
    this.badges$ = this.gamificationService.badges$;
    this.userProfile$ = this.profileService.getProfile();
  }
}