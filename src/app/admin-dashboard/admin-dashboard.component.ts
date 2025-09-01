import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="placeholder-container">
      <h2>Admin Dashboard (Coming Soon!)</h2>
      <p>Manage users, review community contributions, and configure system settings.</p>
      <div class="icon">🛠️</div>
    </div>
  `,
  styles: [`
    .placeholder-container { max-width: 800px; margin: 2rem auto; padding: 20px; color: #e0e0e0; text-align: center; }
    h2 { color: #0abdc6; text-shadow: 0 0 8px #0abdc6; margin-bottom: 1rem; }
    p { color: #a0a0c0; margin-bottom: 2rem; }
    .icon { font-size: 4rem; }
  `]
})
export class AdminDashboardComponent {}