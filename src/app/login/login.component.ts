import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseAuthUiComponent, SocialButton } from '@supabase/auth-ui-angular';
import { Provider } from '@supabase/supabase-js';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, SupabaseAuthUiComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  socialProviders: Provider[] = ['google', 'facebook', 'apple', 'discord', 'github'];
  
  // Customizing the social button appearance
  socialButtons: SocialButton[] = this.socialProviders.map(provider => ({
    provider,
    classes: `custom-social-button ${provider}-button`
  }));
}