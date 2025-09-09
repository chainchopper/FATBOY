import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { ProfileService } from '../services/profile.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private profileService: ProfileService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  canActivate(): Observable<boolean> {
    return this.profileService.getProfile().pipe(
      take(1),
      map(profile => {
        if (profile && profile.role === 'admin') {
          return true;
        } else {
          this.notificationService.showError('You do not have permission to access this page.', 'Access Denied');
          this.router.navigate(['/scanner']);
          return false;
        }
      })
    );
  }
}