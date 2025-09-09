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
  dashboardStats = { totalUsers: 0, pendingContributions: 0, totalContributions: 0 };
  expandedContributionId: string | null = null;

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    this.dashboardStats = await this.adminService.getDashboardStats();
    this.pendingContributions = await this.adminService.getPendingContributions();
    this.isLoading = false;
  }

  toggleExpand(id: string) {
    this.expandedContributionId = this.expandedContributionId === id ? null : id;
  }

  async approve(id: string) {
    await this.adminService.updateContributionStatus(id, 'approved');
    this.notificationService.showSuccess('Contribution approved.');
    this.loadData(); // Refresh list
  }

  async reject(id: string) {
    await this.adminService.updateContributionStatus(id, 'rejected');
    this.notificationService.showInfo('Contribution rejected.');
    this.loadData(); // Refresh list
  }
}