import { Component } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DevConsoleService, PrepopulationResult } from '../services/dev-console.service';
import { NotificationService } from '../services/notification.service';
import { ButtonComponent } from '../button/button.component';
import { TextareaComponent } from '../textarea/textarea.component';

@Component({
  selector: 'app-dev-console',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe, ButtonComponent, TextareaComponent],
  templateUrl: './dev-console.component.html',
  styleUrls: []
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
      case 'success': return 'border-teal-500 bg-teal-900/20';
      case 'skipped': return 'border-yellow-500 bg-yellow-900/20';
      case 'not_found': return 'border-gray-500 bg-gray-800/50';
      case 'failed': return 'border-red-500 bg-red-900/20';
      default: return '';
    }
  }
}