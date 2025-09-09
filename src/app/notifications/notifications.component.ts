import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { UserNotificationService, UserNotification } from '../services/user-notification.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications$!: Observable<UserNotification[]>;
  @Output() close = new EventEmitter<void>();

  constructor(
    private userNotificationService: UserNotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.notifications$ = this.userNotificationService.notifications$;
  }

  handleNotificationClick(notification: UserNotification) {
    this.userNotificationService.markAsRead(notification.id);
    if (notification.link_to) {
      this.router.navigateByUrl(notification.link_to);
    }
    this.close.emit();
  }

  markAllAsRead() {
    this.userNotificationService.markAllAsRead();
  }

  getIconForType(type: string): string {
    switch (type) {
      case 'contribution_like': return 'heart';
      case 'contribution_comment': return 'message-square';
      case 'friend_request': return 'user-plus';
      default: return 'bell';
    }
  }
}