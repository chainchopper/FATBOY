import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { Profile } from '../services/profile.service';
import { NotificationService } from '../services/notification.service';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../button/button.component'; // Corrected import path

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  users: Profile[] = [];
  isLoading = true;

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.isLoading = true;
    this.users = await this.adminService.getAllUsers() as Profile[];
    this.isLoading = false;
  }

  async changeRole(user: Profile, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const newRole = selectElement.value as 'user' | 'admin';

    const updatedUser = await this.adminService.updateUserRole(user.id, newRole);
    if (updatedUser) {
      this.notificationService.showSuccess(`${user.first_name}'s role updated to ${newRole}.`);
      this.loadUsers();
    } else {
      this.notificationService.showError(`Failed to update ${user.first_name}'s role.`);
      selectElement.value = user.role;
    }
  }
}