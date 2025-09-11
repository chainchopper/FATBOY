import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { UserNotificationService } from '../services/user-notification.service';
import { UiService } from '../services/ui.service';
import { Observable } from 'rxjs';
import { LogoComponent } from '../logo/logo.component';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, LogoComponent],
  template: `
    <nav class="fixed top-0 left-0 right-0 z-[1001] flex items-center justify-between h-[70px] px-5 bg-gray-900/60 backdrop-blur-lg border-b border-gray-700/50">
      <div class="flex items-center gap-2.5 w-1/3">
        <button class="p-2 text-gray-200 transition-colors duration-300 bg-transparent border-none cursor-pointer hover:text-teal-400" (click)="toggleMenu()" title="Open Menu">
          <lucide-icon name="menu" [size]="24"></lucide-icon>
        </button>
        <button class="p-2 text-gray-200 transition-colors duration-300 bg-transparent border-none cursor-pointer hover:text-teal-400" routerLink="/console" title="Open AI Assistant">
          <lucide-icon name="message-circle" [size]="24"></lucide-icon>
        </button>
      </div>

      <div class="flex items-center justify-center w-1/3 cursor-pointer" (click)="goToHome()">
        <app-logo></app-logo>
      </div>

      <div class="flex items-center justify-end gap-2.5 w-1/3">
        <button class="relative p-2 text-gray-200 bg-transparent border-none cursor-pointer" (click)="toggleNotifications()" title="Notifications">
          <lucide-icon name="bell" [size]="24"></lucide-icon>
          <span *ngIf="(unreadNotifications$ | async) as count" 
                class="absolute top-0 right-0 flex items-center justify-center w-[18px] h-[18px] text-xs font-bold text-gray-900 bg-purple-400 rounded-full transition-transform duration-300 ease-in-out-back"
                [class.scale-100]="count > 0"
                [class.scale-0]="count === 0">
            {{ count }}
          </span>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    @keyframes ease-in-out-back {
      0% { transform: scale(0); }
      100% { transform: scale(1); }
    }
    .ease-in-out-back {
      transition-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55);
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