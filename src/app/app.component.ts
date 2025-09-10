import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { ProfileService, Profile } from './services/profile.service';
import { map, filter } from 'rxjs/operators';
import { AppModalComponent } from './app-modal/app-modal.component';
import { LogoComponent } from './logo.component'; // Corrected import path
import { LucideAngularModule } from 'lucide-angular';
import { UserNotificationService } from './services/user-notification.service';
import { NotificationsComponent } from './notifications/notifications.component';
import { UiService } from './services/ui.service';
import { AppHeaderComponent } from './app-header.component'; // Updated import path

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
    LucideAngularModule,
    NotificationsComponent,
    AppHeaderComponent
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

  showNotifications = false;
  unreadNotifications$!: Observable<number>;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private profileService: ProfileService,
    private userNotificationService: UserNotificationService,
    private uiService: UiService
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    this.unreadNotifications$ = this.userNotificationService.unreadCount$;
    
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
      this.showNotifications = false;
      this.uiService.closeMenu();
    });

    this.uiService.isMenuOpen$.subscribe(isOpen => {
      this.isMenuOpen = isOpen;
    });
  }

  toggleMenu(): void {
    this.uiService.toggleMenu();
    this.showNotifications = false;
  }

  closeMenu(): void {
    this.uiService.closeMenu();
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.uiService.closeMenu();
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