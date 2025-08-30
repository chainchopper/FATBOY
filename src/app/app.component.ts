import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoComponent } from './logo/logo.component';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@supabase/supabase-js';
// SpeechService is no longer directly used here, but in scanner components
// import { SpeechService } from './services/speech.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LogoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isMenuOpen = false;
  isFabMenuOpen = false; // New state for FAB action sheet
  currentUser$!: Observable<User | null>;

  constructor(private authService: AuthService, private router: Router) {} // Removed SpeechService injection

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isFabMenuOpen = false; // Close FAB menu if hamburger opens
    }
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  toggleFabMenu(): void {
    this.isFabMenuOpen = !this.isFabMenuOpen;
    if (this.isFabMenuOpen) {
      this.isMenuOpen = false; // Close hamburger menu if FAB menu opens
    }
  }

  closeFabMenu(): void {
    this.isFabMenuOpen = false;
  }

  goToScanner(): void {
    this.router.navigate(['/scanner']);
    this.closeFabMenu();
  }

  goToManualEntry(): void {
    this.router.navigate(['/manual-entry']);
    this.closeFabMenu();
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.closeMenu();
  }

  // Removed toggleVoiceInput and isListening getter
}