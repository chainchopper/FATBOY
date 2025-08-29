import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { supabase } from '../../integrations/supabase/client';
import { Provider } from '@supabase/supabase-js';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  providers: Provider[] = ['google', 'facebook', 'apple', 'discord', 'github'];

  async signInWith(provider: Provider) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
    });
    if (error) {
      console.error('Error signing in:', error.message);
      // In a real app, we would show a user-friendly error message here.
      alert('Error signing in: ' + error.message);
    }
  }
}