import { Component, OnInit } from '@angular/core';

interface Choice {
  text: string;
  nextStoryId?: number;
}

@Component({
  selector: 'app-story-game',
  standalone: true,
  imports: [],
  templateUrl: './story-game.component.html',
  styleUrl: './story-game.component.css'
})
export class StoryGameComponent implements OnInit {
  currentStoryId = 0;
  stories: { id: number; text: string; choices: Choice[] }[] = [
    // ... (existing stories)
  ];

  get currentStory(): { id: number; text: string; choices: Choice[] } | undefined {
    return this.stories.find((story) => story.id === this.currentStoryId);
  }

  choose(storyId: number): void {
    if (!this.currentStory || !this.currentStory.choices.some(choice => choice.nextStoryId === storyId)) {
      alert('Invalid choice! Please try again.');
      return;
    }
    this.currentStoryId = storyId;
  }

  ngOnInit(): void {}
}