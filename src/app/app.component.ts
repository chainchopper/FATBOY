import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { ProfileService, Profile } from './services/profile.service';
import { map, filter } from 'rxjs/operators';
import { AppModalComponent } from './app-modal/app-modal.component';
import { LogoComponent } from './logo/logo.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    AppModalComponent, 
    LogoComponent, 
    LucideAngularModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isMenuOpen = false;
  currentUser$!: Observable<User | null>;
  displayName$!: Observable<string | null>;
  isAdmin$!: Observable<boolean>;
  isScannerPage = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    
    const profile$ = this.profileService.getProfile();

    this.displayName$ = profile$.pipe(
      map(profile => {
        if (profile?.first_name) {
          return profile.first_name;
        }
        return null;
      })
    );

    this.isAdmin$ = profile$.pipe(
      map(profile => profile ? profile.role === 'admin' : false)
    );

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isScannerPage = event.urlAfterRedirects === '/scanner';
    });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  goToAgentConsole(): void {
    this.router.navigate(['/console']);
  }

  goToHome(): void {
    this.router.navigate(['/scanner']);
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.closeMenu();
  }
}