import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivityFeedItem } from '../services/friends.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, DatePipe, LucideAngularModule],
  templateUrl: './activity-feed.component.html',
  styleUrls: []
})
export class ActivityFeedComponent {
  @Input() activityFeed: ActivityFeedItem[] = [];
  @Input() isLoading: boolean = false;
  @Input() emptyMessage: string = "There's no activity to show yet.";

  getIconForActivity(type: string): string {
    switch (type) {
      case 'scan': return 'camera';
      case 'community': return 'users';
      case 'shopping_list': return 'shopping-cart';
      case 'achievement': return 'award';
      case 'friendship': return 'user-plus';
      case 'food_diary': return 'book-open';
      default: return 'activity';
    }
  }
}