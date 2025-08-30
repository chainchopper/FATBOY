import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoComponent } from './logo/logo.component';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { SpeechService } from './services/speech.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LogoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isMenuOpen = false;
  currentUser$!: Observable<User | null>;

  constructor(private authService: AuthService, private speechService: SpeechService) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.closeMenu();
  }

  toggleVoiceInput(): void {
    if (this.speechService.listening) {
      this.speechService.stopListening();
    } else {
      this.speechService.startListening();
    }
  }

  get isListening(): boolean {
    return this.speechService.listening;
  }
}