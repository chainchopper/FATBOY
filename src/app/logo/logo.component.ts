import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg width="140" height="40" viewBox="0 0 140 40" xmlns="http://www.w3.org/2000/svg" class="logo-svg" (click)="goToHome()">
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
      
      <!-- Fat Clock Man -->
      <g transform="translate(20, 20)" class="clock-man">
        <!-- Body/Clock Face -->
        <circle cx="0" cy="0" r="18" fill="url(#scan-gradient)" filter="url(#neon-glow-logo)"/>
        
        <!-- Eyes -->
        <circle cx="-6" cy="-3" r="2" fill="#1a1a2e"/>
        <circle cx="6" cy="-3" r="2" fill="#1a1a2e"/>
        
        <!-- Smile -->
        <path d="M -5 5 Q 0 10 5 5" stroke="#1a1a2e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        
        <!-- Clock Hands -->
        <g class="hands-container">
          <line x1="0" y1="0" x2="0" y2="-8" stroke="#1a1a2e" stroke-width="2" stroke-linecap="round" class="minute-hand"/>
          <line x1="0" y1="0" x2="6" y2="4" stroke="#1a1a2e" stroke-width="2" stroke-linecap="round" class="hour-hand"/>
        </g>
      </g>
      
      <!-- Text -->
      <text x="45" y="30" class="logo-text" filter="url(#neon-glow-logo)">Fat Boy</text>
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
    .clock-man {
      transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    }
    .logo-svg:hover .clock-man {
      transform: translate(20, 20) rotate(10deg) scale(1.1);
    }
    
    .hands-container {
      transform-origin: center;
      animation: tick-tock 12s linear infinite;
    }

    .minute-hand {
      animation: rotate-minute 60s linear infinite;
      transform-origin: center;
    }
    
    .hour-hand {
      animation: rotate-hour 720s linear infinite;
      transform-origin: center;
    }

    @keyframes tick-tock {
      0% { transform: rotate(0deg); }
      25% { transform: rotate(5deg); }
      75% { transform: rotate(-5deg); }
      100% { transform: rotate(0deg); }
    }

    @keyframes rotate-minute {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes rotate-hour {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class LogoComponent {
  constructor(private router: Router) {}

  goToHome(): void {
    this.router.navigate(['/scanner']);
  }
}