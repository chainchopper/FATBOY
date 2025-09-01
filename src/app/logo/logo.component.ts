import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <div class="logo-container" (click)="goToHome()">
      <svg width="40" height="40" viewBox="-25 -25 50 50" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
        <defs>
          <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f038ff;" />
            <stop offset="100%" style="stop-color:#DD00FF;" />
          </linearGradient>
        </defs>
        
        <!-- Clock Body -->
        <g class="clock-body">
          <!-- Bells -->
          <circle cx="-12" cy="-18" r="5" fill="#A020F0" />
          <circle cx="12" cy="-18" r="5" fill="#A020F0" />
          
          <!-- Main Body -->
          <circle cx="0" cy="0" r="20" fill="#A020F0" filter="url(#logo-glow)"/>
          
          <!-- Clock Face -->
          <circle cx="0" cy="0" r="17" fill="url(#logo-gradient)"/>
          
          <!-- Face Details -->
          <g class="face">
            <!-- Eyes -->
            <path d="M -10 -3 C -8 -8, -4 -8, -2 -3" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <path d="M 2 -3 C 4 -8, 8 -8, 10 -3" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <!-- Blush -->
            <circle cx="-12" cy="2" r="3" fill="white" opacity="0.2"/>
            <circle cx="12" cy="2" r="3" fill="white" opacity="0.2"/>
            <!-- Mouth -->
            <path d="M -8 6 Q 0 12 8 6" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </g>

          <!-- Clock Hands -->
          <g class="hands-container">
            <line x1="0" y1="0" x2="0" y2="-9" stroke="#0abdc6" stroke-width="2" stroke-linecap="round" class="minute-hand"/>
            <line x1="0" y1="0" x2="7" y2="4" stroke="#0abdc6" stroke-width="2" stroke-linecap="round" class="hour-hand"/>
          </g>
        </g>
      </svg>
    </div>
  `,
  styles: [`
    .logo-container {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-svg {
      transition: transform 0.3s ease-in-out;
    }
    .logo-container:hover .logo-svg {
      transform: scale(1.1);
    }
    .clock-body {
      animation: subtle-bob 5s infinite ease-in-out;
      transform-origin: center;
    }
    .minute-hand, .hour-hand {
      transform-origin: center;
    }
    .minute-hand {
      animation: rotate-minute 60s linear infinite;
    }
    .hour-hand {
      animation: rotate-hour 720s linear infinite;
    }

    @keyframes subtle-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-1px); }
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