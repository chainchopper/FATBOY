import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { Profile } from '../services/profile.service';
import { NotificationService } from '../services/notification.service';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../components/ui/button/button.component'; // Import ButtonComponent

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent], // Add ButtonComponent to imports
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
      this.loadUsers(); // Refresh the list
    } else {
      this.notificationService.showError(`Failed to update ${user.first_name}'s role.`);
      // Revert the dropdown on failure
      selectElement.value = user.role;
    }
  }
}