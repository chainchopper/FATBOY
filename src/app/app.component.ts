import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoComponent } from './logo/logo.component';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { ProfileService, Profile } from './services/profile.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LogoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isMenuOpen = false;
  isFabMenuOpen = false;
  currentUser$!: Observable<User | null>;
  displayName$!: Observable<string | null>;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    this.displayName$ = this.profileService.getProfile().pipe(
      map(profile => {
        if (profile?.first_name) {
          return profile.first_name;
        }
        return null;
      })
    );
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isFabMenuOpen = false;
    }
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  toggleFabMenu(): void {
    this.isFabMenuOpen = !this.isFabMenuOpen;
    if (this.isFabMenuOpen) {
      this.isMenuOpen = false;
    }
  }

  closeFabMenu(): void {
    this.isFabMenuOpen = false;
  }

  goToScanner(): void {
    this.router.navigate(['/scanner']);
    this.closeFabMenu();
  }

  goToManualEntry(): void {
    this.router.navigate(['/manual-entry']);
    this.closeFabMenu();
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.closeMenu();
  }
}