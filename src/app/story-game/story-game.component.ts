import { Component } from '@angular/core';

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
export class StoryGameComponent {
  currentStoryId = 0;
  stories: { id: number; text: string; choices: Choice[] }[] = [
    // Add more stories here...
  ];

  get currentStory(): { id: number; text: string; choices: Choice[] } | undefined {
    return this.stories.find((story) => story.id === this.currentStoryId);
  }

  choose(storyId: number): void {
    this.currentStoryId = storyId;
  }
}