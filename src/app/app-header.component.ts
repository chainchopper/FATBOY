import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { LogoComponent } from './logo.component'; // This import will no longer be needed in the template, but kept for now.
import { UserNotificationService } from './services/user-notification.service';
import { UiService } from './services/ui.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, LogoComponent], // LogoComponent is still imported but not used in template
  template: `
    <nav class="main-nav">
      <div class="header-left">
        <button class="header-btn" (click)="toggleMenu()" title="Open Menu">
          <lucide-icon name="menu" [size]="24"></lucide-icon>
        </button>
        <button class="header-btn" routerLink="/console" title="Open AI Assistant">
          <lucide-icon name="message-circle" [size]="24"></lucide-icon>
        </button>
      </div>

      <div class="header-title" (click)="goToHome()">
        <!-- Removed <app-logo></app-logo> as per user's request -->
        <div class="title-text">
          <span>FAT BOY TIME</span> <!-- Corrected main title text -->
          <span class="header-subtitle">Powered by Nirvana</span> <!-- Corrected subtitle text -->
        </div>
      </div>

      <div class="header-right">
        <button class="notification-btn" (click)="toggleNotifications()" title="Notifications">
          <lucide-icon name="bell" [size]="24"></lucide-icon>
          <span *ngIf="(unreadNotifications$ | async) as count" class="notification-badge" [class.visible]="count > 0">
            {{ count }}
          </span>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    @keyframes neon-flicker {
      0%, 100% {
        text-shadow:
          0 0 2px #fff,
          0 0 5px #fff,
          0 0 8px #fff,
          0 0 10px #f038ff,
          0 0 18px #f038ff,
          0 0 25px #f038ff,
          0 0 40px #f038ff;
        color: #f8c3ff;
      }
      50% {
        text-shadow:
          0 0 2px #fff,
          0 0 6px #fff,
          0 0 10px #fff,
          0 0 15px #0abdc6,
          0 0 25px #0abdc6,
          0 0 35px #0abdc6,
          0 0 50px #0abdc6;
        color: #c7faff;
      }
    }

    .main-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      background: rgba(26, 26, 46, 0.6);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid transparent; /* Changed to transparent */
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1001;
      height: 70px;
    }

    .header-left, .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-btn {
      background: transparent;
      border: none;
      color: #e0e0e0;
      cursor: pointer;
      padding: 8px;
      transition: color 0.3s;
    }
    .header-btn:hover {
      color: #0abdc6;
    }

    .header-title {
      font-family: 'Righteous', cursive;
      font-size: 1.5rem;
      color: #f038ff;
      text-shadow: 0 0 8px #f038ff;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      animation: neon-flicker 5s infinite alternate ease-in-out;
    }

    .header-title .title-text {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .header-title .title-text span:first-child {
      font-size: 1.5rem;
      color: #f038ff;
      text-shadow: 0 0 8px #f038ff;
    }

    .header-title .header-subtitle {
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      color: #a0a0c0;
      text-shadow: none;
      animation: none;
    }

    .notification-btn {
      position: relative;
      background: transparent;
      border: none;
      color: #e0e0e0;
      cursor: pointer;
      padding: 8px;
    }

    .notification-badge {
      position: absolute;
      top: 0;
      right: 0;
      background-color: #f038ff;
      color: #1a1a2e;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: scale(0);
      transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    }

    .notification-badge.visible {
      transform: scale(1);
    }
  `]
})
export class AppHeaderComponent implements OnInit {
  unreadNotifications$!: Observable<number>;
  @Output() toggleNotificationsEvent = new EventEmitter<void>();

  constructor(
    private userNotificationService: UserNotificationService,
    private uiService: UiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.unreadNotifications$ = this.userNotificationService.unreadCount$;
  }

  toggleMenu(): void {
    this.uiService.toggleMenu();
  }

  toggleNotifications(): void {
    this.toggleNotificationsEvent.emit();
  }

  goToHome(): void {
    this.router.navigate(['/scanner']);
  }
}