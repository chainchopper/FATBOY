import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { UserNotificationService } from './services/user-notification.service';
import { UiService } from './services/ui.service';
import { Observable } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'; // Import DomSanitizer

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    <nav class="fixed top-0 left-0 right-0 z-[1001] flex items-center justify-between h-[70px] px-5 bg-gray-900/60 backdrop-blur-lg border-b border-transparent">
      <div class="flex items-center gap-2.5">
        <button class="p-2 text-gray-200 transition-colors duration-300 bg-transparent border-none cursor-pointer hover:text-teal-400" (click)="toggleMenu()" title="Open Menu">
          <lucide-icon name="menu" [size]="24"></lucide-icon>
        </button>
        <button class="p-2 text-gray-200 transition-colors duration-300 bg-transparent border-none cursor-pointer hover:text-teal-400" routerLink="/console" title="Open AI Assistant">
          <lucide-icon name="message-circle" [size]="24"></lucide-icon>
        </button>
      </div>

      <div class="flex items-center gap-2.5 cursor-pointer" (click)="goToHome()">
        <div class="flex flex-col items-center">
          <span class="font-['Righteous',_cursive] text-2xl text-purple-400 drop-shadow-lg shadow-purple-400 animate-neon-flicker flex items-center gap-1.5" [innerHTML]="getAnimatedTitle()"></span>
          <span class="font-['Inter',_sans-serif] text-xs text-gray-400">Powered by Nirvana</span>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
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
    .logo-in-text {
      height: 1.5em;
      vertical-align: middle;
      margin: 0 2px;
    }
  `]
})
export class AppHeaderComponent implements OnInit {
  unreadNotifications$!: Observable<number>;
  @Output() toggleNotificationsEvent = new EventEmitter<void>();

  constructor(
    private userNotificationService: UserNotificationService,
    private uiService: UiService,
    private router: Router,
    private sanitizer: DomSanitizer // Inject DomSanitizer
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

  getAnimatedTitle(): SafeHtml {
    const logoHtml = `<img src="assets/logo64.png" alt="O" class="logo-in-text">`;
    const title = `FAT B${logoHtml}Y TIME`;
    return this.sanitizer.bypassSecurityTrustHtml(title);
  }
}