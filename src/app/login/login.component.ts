import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { supabase } from '../../integrations/supabase/client';
import { Provider } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  providers: Provider[] = ['google', 'facebook', 'apple', 'discord', 'github'];

  constructor(private router: Router, private notificationService: NotificationService) {}

  async signInWith(provider: Provider) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin // Redirects back to the app after OAuth flow
      }
    });
    if (error) {
      console.error('Error signing in:', error.message);
      this.notificationService.showError('Error signing in: ' + error.message, 'Login Failed');
    }
  }
}