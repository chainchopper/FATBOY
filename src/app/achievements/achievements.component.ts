import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamificationService, Badge } from '../services/gamification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.css']
})
export class AchievementsComponent implements OnInit {
  badges$!: Observable<Badge[]>;

  constructor(private gamificationService: GamificationService) {}

  ngOnInit() {
    this.badges$ = this.gamificationService.badges$;
    this.gamificationService.checkAndUnlockAchievements(); // Re-check on view
  }
}