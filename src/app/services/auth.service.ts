import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../integrations/supabase/client';
import { Router } from '@angular/router';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _currentUser = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this._currentUser.asObservable();

  private _currentSession = new BehaviorSubject<Session | null>(null);
  public currentSession$: Observable<Session | null> = this._currentSession.asObservable();

  constructor(private router: Router, private notificationService: NotificationService) {
    this.initializeAuthListener();
  }

  private async initializeAuthListener(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    this._currentSession.next(session);
    this._currentUser.next(session?.user || null);

    supabase.auth.onAuthStateChange((event, session) => {
      this._currentSession.next(session);
      this._currentUser.next(session?.user || null);

      if (event === 'SIGNED_IN') {
        this.notificationService.showSuccess('Welcome back!', 'Logged In');
        this.router.navigate(['/ocr-scanner']); // Redirect to a protected page or home
      } else if (event === 'SIGNED_OUT') {
        this.notificationService.showInfo('You have been logged out.', 'Logged Out');
        this.router.navigate(['/login']); // Redirect to login page
      } else if (event === 'USER_UPDATED') {
        this.notificationService.showInfo('Your profile has been updated.', 'Profile Update');
      }
    });
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      this.notificationService.showError('Failed to log out.', 'Logout Error');
    }
  }

  isAuthenticated(): boolean {
    return !!this._currentSession.getValue();
  }

  getCurrentUserId(): string | undefined {
    return this._currentUser.getValue()?.id;
  }
}