import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo">
      <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f038ff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0abdc6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#grad1)" stroke="#fff" stroke-width="4"/>
        <text x="50" y="62" font-family="Righteous, cursive" font-size="40" fill="#1a1a2e" text-anchor="middle">FB</text>
      </svg>
    </div>
  `,
  styles: [`
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class LogoComponent { }