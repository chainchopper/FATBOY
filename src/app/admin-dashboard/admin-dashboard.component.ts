import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  pendingContributions: any[] = [];
  isLoading = true;

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadPendingContributions();
  }

  async loadPendingContributions() {
    this.isLoading = true;
    this.pendingContributions = await this.adminService.getPendingContributions();
    this.isLoading = false;
  }

  async approve(id: string) {
    await this.adminService.updateContributionStatus(id, 'approved');
    this.notificationService.showSuccess('Contribution approved.');
    this.loadPendingContributions(); // Refresh list
  }

  async reject(id: string) {
    await this.adminService.updateContributionStatus(id, 'rejected');
    this.notificationService.showInfo('Contribution rejected.');
    this.loadPendingContributions(); // Refresh list
  }
}