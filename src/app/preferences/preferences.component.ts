import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.css']
})
export class PreferencesComponent implements OnInit {
  preferences = {
    avoidArtificialSweeteners: true,
    avoidArtificialColors: true,
    avoidHFCS: true,
    avoidPreservatives: false,
    avoidMSG: false,
    avoidTransFats: true,
    maxCalories: 200,
    goal: 'avoidChemicals' // 'strictlyNatural', 'avoidChemicals', 'calorieCount'
  };

  private currentUserId: string | null = null;

  constructor(private notificationService: NotificationService, private authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadPreferences(); // Reload preferences when user changes
    });
  }

  savePreferences() {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.preferences));
    this.notificationService.showSuccess('Preferences saved!');
  }

  private getStorageKey(): string {
    return this.currentUserId ? `fatBoyPreferences_${this.currentUserId}` : 'fatBoyPreferences_anonymous';
  }

  private loadPreferences() {
    const saved = localStorage.getItem(this.getStorageKey());
    if (saved) {
      this.preferences = JSON.parse(saved);
    } else {
      // Reset to default if no saved preferences for the current user
      this.preferences = {
        avoidArtificialSweeteners: true,
        avoidArtificialColors: true,
        avoidHFCS: true,
        avoidPreservatives: false,
        avoidMSG: false,
        avoidTransFats: true,
        maxCalories: 200,
        goal: 'avoidChemicals'
      };
    }
  }
}