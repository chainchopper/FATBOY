import { Injectable, isDevMode } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // Allow access during development mode for easier previewing
    if (isDevMode()) {
      console.warn('AuthGuard bypassed in development mode.');
      return true;
    }

    if (this.authService.isAuthenticated()) {
      return true;
    } else {
      this.notificationService.showWarning('Please log in to access this page.', 'Access Denied');
      return this.router.createUrlTree(['/login']);
    }
  }
}