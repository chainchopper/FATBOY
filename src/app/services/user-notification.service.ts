import { Injectable } from '@angular/core';
import { supabase } from '../../integrations/supabase/client';
import { AuthService } from './auth.service';
import { BehaviorSubject, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface UserNotification {
  id: string;
  message: string;
  link_to: string;
  is_read: boolean;
  created_at: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserNotificationService {
  private notificationsSubject = new BehaviorSubject<UserNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private currentUserId: string | null = null;

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      if (this.currentUserId) {
        this.startPolling();
      }
    });
  }

  private startPolling() {
    timer(0, 60000) // Poll every 60 seconds, and immediately at start
      .pipe(
        switchMap(() => this.fetchNotifications())
      )
      .subscribe();
  }

  async fetchNotifications() {
    if (!this.currentUserId) return;

    const { data, error } = await supabase
      .from('nirvana_notifications')
      .select('*')
      .eq('user_id', this.currentUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    this.notificationsSubject.next(data as UserNotification[]);
    const unreadCount = data.filter(n => !n.is_read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  async markAsRead(notificationId: string) {
    if (!this.currentUserId) return;

    const { error } = await supabase
      .from('nirvana_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('Error marking notification as read:', error);
    } else {
      // Optimistic update
      const currentNotifications = this.notificationsSubject.getValue();
      const notification = currentNotifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        const updatedNotifications = currentNotifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        this.notificationsSubject.next(updatedNotifications);
        this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.getValue() - 1));
      }
    }
  }

  async markAllAsRead() {
    if (!this.currentUserId) return;

    const { error } = await supabase
      .from('nirvana_notifications')
      .update({ is_read: true })
      .eq('user_id', this.currentUserId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
    } else {
      // Optimistic update
      const currentNotifications = this.notificationsSubject.getValue();
      const updatedNotifications = currentNotifications.map(n => ({ ...n, is_read: true }));
      this.notificationsSubject.next(updatedNotifications);
      this.unreadCountSubject.next(0);
    }
  }
}