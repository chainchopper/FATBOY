import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-receipt-scanner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="receipt-scanner-container">
      <h2>Receipt Scanner (Coming Soon!)</h2>
      <p>Scan your grocery receipts to automatically track purchases, add items to your diary, and get smart suggestions.</p>
      <div class="placeholder-content">
        <span class="icon">🧾</span>
        <p>This feature is under development. Stay tuned for AI-powered receipt analysis!</p>
      </div>
    </div>
  `,
  styles: [`
    .receipt-scanner-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 20px;
      color: #e0e0e0;
      text-align: center;
    }
    h2 {
      color: #0abdc6;
      text-shadow: 0 0 8px #0abdc6;
      margin-bottom: 1rem;
    }
    p {
      color: #a0a0c0;
      margin-bottom: 2rem;
    }
    .placeholder-content {
      background: rgba(15, 15, 30, 0.8);
      border: 1px solid #f038ff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 0 25px rgba(240, 56, 255, 0.5);
    }
    .icon {
      font-size: 4rem;
      display: block;
      margin-bottom: 20px;
    }
  `]
})
export class ReceiptScannerComponent {}