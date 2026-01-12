import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { UserNotificationService } from '../services/user-notification.service';
import { Observable, map } from 'rxjs';
import { LogoComponent } from '../logo/logo.component';
import { AiStatusService } from '../services/ai-status.service';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule, LogoComponent],
  template: `
    <header class="w-full fixed top-0 left-0 right-0 z-50 glass-morphism border-b border-purple-500/30 h-[70px] animate-slide-down">
      <div class="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-3">
          <a routerLink="/scanner" class="flex items-center gap-3 no-underline transition-smooth hover-lift">
            <app-logo></app-logo>
            <span class="hidden sm:inline-block text-lg font-semibold text-gradient-animated">NATURALYTE</span>
          </a>
          <span class="inline-flex items-center gap-1 text-xs text-gray-300">
            <span class="w-2.5 h-2.5 rounded-full border-2 animate-pulse"
                  [ngClass]="(aiStatus$ | async) === 'online' ? 'bg-teal-400 border-teal-300 shadow-lg shadow-teal-400/50' : 'bg-red-500 border-red-400 shadow-lg shadow-red-400/50'">
            </span>
            <span class="font-medium">{{ (aiStatus$ | async) === 'online' ? 'Nirvana Online' : 'Intelligence Offline' }}</span>
          </span>
        </div>

        <nav class="hidden md:flex items-center gap-1">
          <a routerLink="/scanner" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">Scanner</a>
          <a routerLink="/console" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">Assistant</a>
          <a routerLink="/history" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">History</a>
          <a routerLink="/favorites" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">Favorites</a>
          <a routerLink="/shopping-list" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">Shopping</a>
          <a routerLink="/food-diary" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">Diary</a>
          <a routerLink="/suggestions" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">Suggestions</a>
          <a routerLink="/community" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">Community</a>
          <a routerLink="/preferences" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">Preferences</a>
          <a routerLink="/system-check" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">System</a>
          <a *ngIf="(isAdmin$ | async)" routerLink="/admin/dashboard" routerLinkActive="text-teal-400 bg-purple-500/20" class="px-3 py-2 text-gray-200 hover:text-teal-400 rounded-md transition-smooth hover-lift">Admin</a>
        </nav>

        <div class="flex items-center gap-3">
          <button (click)="toggleNotifications()" class="relative p-2 rounded-md text-gray-200 hover:text-teal-400 transition-smooth hover-lift">
            <lucide-icon name="bell" [size]="20"></lucide-icon>
            <span *ngIf="(unread$ | async) as c" class="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-pulse shadow-lg shadow-purple-500/50" [class.hidden]="c === 0">{{ c }}</span>
          </button>

          <button (click)="goToProfile()" class="hidden sm:inline-flex items-center gap-2 text-sm text-gray-200 px-3 py-2 rounded-md hover:bg-purple-500/20 hover:text-teal-400 transition-smooth hover-lift">
            <lucide-icon name="user" [size]="18"></lucide-icon>
            <span>Profile</span>
          </button>

          <button (click)="openMenu()" class="md:hidden p-2 text-gray-200 hover:text-teal-400 transition-smooth">
            <lucide-icon name="menu" [size]="22"></lucide-icon>
          </button>
        </div>
      </div>

      <div *ngIf="mobileOpen" class="md:hidden bg-gray-900 border-t border-gray-800">
        <div class="px-4 py-3 flex flex-col gap-1">
          <a routerLink="/scanner" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">Scanner</a>
          <a routerLink="/console" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">Assistant</a>
          <a routerLink="/history" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">History</a>
          <a routerLink="/favorites" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">Favorites</a>
          <a routerLink="/shopping-list" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">Shopping</a>
          <a routerLink="/food-diary" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">Diary</a>
          <a routerLink="/suggestions" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">Suggestions</a>
          <a routerLink="/community" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">Community</a>
          <a routerLink="/preferences" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">Preferences</a>
          <a routerLink="/system-check" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">System</a>
          <a *ngIf="(isAdmin$ | async)" routerLink="/admin/dashboard" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">Admin</a>
          <a routerLink="/profile" (click)="closeMenu()" class="block px-2 py-2 text-gray-200 hover:text-teal-400">Profile</a>
        </div>
      </div>
    </header>
  `,
  styles: []
})
export class AppHeaderComponent implements OnInit {
  @Output() toggleNotificationsEvent = new EventEmitter<void>();
  unread$!: Observable<number>;
  mobileOpen = false;
  aiStatus$ = this.aiStatusService.status$;
  isAdmin$!: Observable<boolean>;

  constructor(
    private userNotificationService: UserNotificationService,
    private aiStatusService: AiStatusService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.unread$ = this.userNotificationService.unreadCount$;
    this.isAdmin$ = this.profileService.getProfile().pipe(
      map(p => !!p && p.role === 'admin')
    );
  }

  toggleNotifications() {
    this.toggleNotificationsEvent.emit();
  }

  openMenu() {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMenu() {
    this.mobileOpen = false;
  }

  goToProfile() {
    this.router.navigate(['/profile']);
    this.closeMenu();
  }
}