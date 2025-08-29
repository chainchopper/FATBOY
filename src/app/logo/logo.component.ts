import { Component } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
      <defs>
        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <text x="5" y="30" class="logo-text" filter="url(#neon-glow)">Fat Boy</text>
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