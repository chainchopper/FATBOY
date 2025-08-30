import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GamificationService } from '../services/gamification.service';
import { AuthService } from '../services/auth.service';

interface CommunityContribution {
  productName: string;
  brand: string;
  barcode: string;
  ingredients: string;
  notes: string;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
  id: string; // Unique ID for each contribution
  likes: number;
  comments: { username: string; text: string; timestamp: Date }[];
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.css']
})
export class CommunityComponent {
  newContribution = {
    productName: '',
    brand: '',
    barcode: '',
    ingredients: '',
    notes: ''
  };

  isSubmitted = false;
  private currentUserId: string | null = null;
  communityContributions: CommunityContribution[] = [];
  newCommentText: { [key: string]: string } = {}; // To hold comment text for each contribution

  constructor(private gamificationService: GamificationService, private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.loadContributions(); // Load contributions when user changes
    });
  }

  submitContribution() {
    const newId = Date.now().toString(); // Simple unique ID
    const contribution: CommunityContribution = {
      ...this.newContribution,
      timestamp: new Date(),
      status: 'pending',
      id: newId,
      likes: 0,
      comments: []
    };
    
    this.communityContributions.unshift(contribution); // Add to the beginning
    this.saveContributions();
    this.isSubmitted = true;
    
    this.newContribution = {
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

  toggleLike(contributionId: string): void {
    const contribution = this.communityContributions.find(c => c.id === contributionId);
    if (contribution) {
      contribution.likes = (contribution.likes || 0) + 1; // Simple like increment
      this.saveContributions();
    }
  }

  addComment(contributionId: string): void {
    const commentText = this.newCommentText[contributionId]?.trim();
    if (!commentText) return;

    const contribution = this.communityContributions.find(c => c.id === contributionId);
    if (contribution) {
      const username = this.currentUserId ? `User_${this.currentUserId.substring(0, 4)}` : 'Anonymous';
      contribution.comments.push({ username, text: commentText, timestamp: new Date() });
      this.saveContributions();
      this.newCommentText[contributionId] = ''; // Clear input
    }
  }

  private getStorageKey(): string {
    return this.currentUserId ? `communityContributions_${this.currentUserId}` : 'communityContributions_anonymous';
  }

  private loadContributions(): void {
    const stored = localStorage.getItem(this.getStorageKey());
    if (stored) {
      this.communityContributions = JSON.parse(stored).map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp),
        comments: c.comments || [] // Ensure comments array exists
      }));
    } else {
      this.communityContributions = [];
    }
  }

  private saveContributions(): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.communityContributions));
  }
}