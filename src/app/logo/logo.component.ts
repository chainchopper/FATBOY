import { Component } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg width="140" height="40" viewBox="0 0 140 40" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
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
      
      <!-- Barcode Icon with integrated Health Cross -->
      <g transform="translate(5, 8)">
        <rect x="0" y="0" width="3" height="24" fill="url(#scan-gradient)"/>
        <rect x="5" y="0" width="2" height="24" fill="url(#scan-gradient)"/>
        <!-- Health Cross -->
        <rect x="9" y="0" width="5" height="10" fill="url(#scan-gradient)"/>
        <rect x="9" y="14" width="5" height="10" fill="url(#scan-gradient)"/>
        <rect x="9" y="10" width="2" height="4" fill="url(#scan-gradient)"/>
        <rect x="12" y="10" width="2" height="4" fill="url(#scan-gradient)"/>
        
        <rect x="16" y="0" width="2" height="24" fill="url(#scan-gradient)"/>
        <rect x="20" y="0" width="3" height="24" fill="url(#scan-gradient)"/>
        <rect x="25" y="0" width="2" height="24" fill="url(#scan-gradient)"/>
      </g>
      
      <!-- Text -->
      <text x="40" y="30" class="logo-text" filter="url(#neon-glow-logo)">Fat Boy</text>
    </svg>
  `,
  styles: [`
    .logo-svg {
      font-family: 'Roboto Mono', monospace;
      font-weight: 700;
      font-size: 28px;
      letter-spacing: 1px;
    }
    .logo-text {
      fill: #f038ff;
      stroke: #f038ff;
      stroke-width: 0.5px;
    }
  `]
})
export class LogoComponent {}