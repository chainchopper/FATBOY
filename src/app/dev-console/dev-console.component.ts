import { Component } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DevConsoleService, PrepopulationResult } from '../services/dev-console.service';
import { NotificationService } from '../services/notification.service';
import { ButtonComponent } from '../button.component'; // Updated import path

@Component({
  selector: 'app-dev-console',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe, ButtonComponent],
  templateUrl: './dev-console.component.html',
  styleUrls: ['./dev-console.component.css']
})
export class DevConsoleComponent {
  productNames: string = '';
  isLoading = false;
  results: PrepopulationResult[] = [];

  constructor(
    private devConsoleService: DevConsoleService,
    private notificationService: NotificationService
  ) {}

  async onPrepopulate() {
    const names = this.productNames.split('\n').map(name => name.trim()).filter(name => name.length > 0);
    if (names.length === 0) {
      this.notificationService.showWarning('Please enter at least one product name.');
      return;
    }

    this.isLoading = true;
    this.results = [];
    try {
      this.results = await this.devConsoleService.prepopulateData(names);
      this.notificationService.showSuccess('Pre-population process completed!');
    } catch (error) {
      this.notificationService.showError('An error occurred during pre-population.');
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  getResultClass(status: string) {
    switch (status) {
      case 'success': return 'status-success';
      case 'skipped': return 'status-skipped';
      case 'not_found': return 'status-not-found';
      case 'failed': return 'status-failed';
      default: return '';
    }
  }
}