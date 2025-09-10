import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProfileService, Profile } from '../services/profile.service';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { ButtonComponent } from '../button.component'; // Updated import path

@Component({
  selector: 'app-profile-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent],
  templateUrl: './profile-editor.component.html',
  styleUrls: []
})
export class ProfileEditorComponent implements OnInit {
  profile: Profile | null = null;
  firstName: string = '';
  lastName: string = '';
  bio: string = '';
  avatarFile: File | null = null;
  avatarUrl: string | null = null;
  isLoading = false;

  constructor(
    private profileService: ProfileService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.profile = await firstValueFrom(this.profileService.getProfile());
    if (this.profile) {
      this.firstName = this.profile.first_name || '';
      this.lastName = this.profile.last_name || '';
      this.bio = this.profile.bio || '';
      this.avatarUrl = this.profile.avatar_url;
    }
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList) {
      this.avatarFile = fileList[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarUrl = e.target.result;
      };
      reader.readAsDataURL(this.avatarFile);
    }
  }

  async saveProfile() {
    this.isLoading = true;
    let newAvatarUrl = this.profile?.avatar_url;

    if (this.avatarFile) {
      const uploadedUrl = await this.profileService.uploadAvatar(this.avatarFile);
      if (uploadedUrl) {
        newAvatarUrl = uploadedUrl;
      } else {
        this.notificationService.showError('Failed to upload new avatar.');
        this.isLoading = false;
        return;
      }
    }

    const updatedProfile = await this.profileService.updateProfile({
      first_name: this.firstName,
      last_name: this.lastName,
      bio: this.bio,
      avatar_url: newAvatarUrl || undefined
    });

    this.isLoading = false;
    if (updatedProfile) {
      this.notificationService.showSuccess('Profile updated successfully!');
      this.router.navigate(['/profile']);
    } else {
      this.notificationService.showError('Failed to update profile.');
    }
  }
}