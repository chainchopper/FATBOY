import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" class="logo-svg" (click)="goToHome()">
      <defs>
        <filter id="neon-glow-logo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="scan-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#f038ff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0abdc6;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Fat Baby Creature Icon (stylized) -->
      <g transform="translate(0, 5)" class="creature-icon"> <!-- Adjusted translate x to 0 -->
        <!-- Body/Head -->
        <circle cx="15" cy="15" r="12" fill="url(#scan-gradient)" filter="url(#neon-glow-logo)"/>
        <!-- Eyes -->
        <circle cx="10" cy="12" r="2" fill="#1a1a2e"/>
        <circle cx="20" cy="12" r="2" fill="#1a1a2e"/>
        <!-- Mouth -->
        <path d="M12 20 Q15 23 18 20" stroke="#1a1a2e" stroke-width="1.5" fill="none"/>
        <!-- Small leaf/health symbol on head -->
        <path d="M22 5 Q25 0 28 5 Q25 10 22 5 Z" fill="#0abdc6" filter="url(#neon-glow-logo)"/>
      </g>
      
      <!-- Text -->
      <text x="35" y="30" class="logo-text" filter="url(#neon-glow-logo)">Fat Boy</text> <!-- Adjusted text x to 35 -->
    </svg>
  `,
  styles: [`
    .logo-svg {
      font-family: 'Roboto Mono', monospace;
      font-weight: 700;
      font-size: 28px;
      letter-spacing: 1px;
      cursor: pointer;
      transition: transform 0.2s ease-in-out;
    }
    .logo-svg:hover {
      transform: scale(1.05);
    }
    .logo-text {
      fill: #f038ff;
      stroke: #f038ff;
      stroke-width: 0.5px;
    }
    .creature-icon {
      transition: transform 0.2s ease-in-out;
    }
    .logo-svg:active .creature-icon {
      transform: translateY(2px);
    }
  `]
})
export class LogoComponent {
  constructor(private router: Router) {}

  goToHome(): void {
    this.router.navigate(['/scanner']);
  }
}