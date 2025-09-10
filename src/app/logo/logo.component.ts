import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo">
      <img src="assets/fatboy-logo.png" alt="Fat Boy Logo" class="fatboy-logo-img">
    </div>
  `,
  styles: [`
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .fatboy-logo-img {
      height: 40px; /* Adjust size as needed */
      width: auto;
    }
  `]
})
export class LogoComponent { }