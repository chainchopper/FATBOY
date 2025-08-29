import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GamificationService } from '../services/gamification.service';

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

  constructor(private gamificationService: GamificationService) {}

  submitContribution() {
    const contributions = JSON.parse(localStorage.getItem('communityContributions') || '[]');
    contributions.push({
      ...this.contribution,
      timestamp: new Date(),
      status: 'pending'
    });
    
    localStorage.setItem('communityContributions', JSON.stringify(contributions));
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