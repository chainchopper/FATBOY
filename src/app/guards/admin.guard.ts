import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  canActivate(): boolean {
    // In a real app, you would check for a specific admin role from the user's profile.
    // For now, we'll just check if the user is authenticated.
    const isAuthenticated = this.authService.isAuthenticated();
    
    if (isAuthenticated) {
      // Placeholder for future role check, e.g., if (user.role === 'admin')
      return true;
    } else {
      this.notificationService.showError('You do not have permission to access this page.', 'Access Denied');
      this.router.navigate(['/login']);
      return false;
    }
  }
}