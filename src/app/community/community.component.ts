import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GamificationService } from '../services/gamification.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.css']
})
export class CommunityComponent {
  contribution = {
    productName: '',
    brand: '',
    barcode: '',
    ingredients: '',
    notes: ''
  };

  isSubmitted = false;
  private currentUserId: string | null = null;

  constructor(private gamificationService: GamificationService, private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
    });
  }

  submitContribution() {
    const storageKey = this.currentUserId ? `communityContributions_${this.currentUserId}` : 'communityContributions_anonymous';
    const contributions = JSON.parse(localStorage.getItem(storageKey) || '[]');
    contributions.push({
      ...this.contribution,
      timestamp: new Date(),
      status: 'pending'
    });
    
    localStorage.setItem(storageKey, JSON.stringify(contributions));
    this.isSubmitted = true;
    
    this.contribution = {
      productName: '',
      brand: '',
      barcode: '',
      ingredients: '',
      notes: ''
    };
    
    this.gamificationService.checkAndUnlockAchievements();

    setTimeout(() => {
      this.isSubmitted = false;
    }, 3000);
  }
}