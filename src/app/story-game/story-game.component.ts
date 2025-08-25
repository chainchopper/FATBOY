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
    {
      id: 0,
      text: 'You find yourself in a dark forest. You can go left or right.',
      choices: [
        { text: 'Go left', nextStoryId: 1 },
        { text: 'Go right', nextStoryId: 2 }
      ]
    },
    // Add more stories here...
  ];

  get currentStory(): { id: number; text: string; choices: Choice[] } {
    return this.stories.find((story) => story.id === this.currentStoryId);
  }

  choose(storyId: number): void {
    this.currentStoryId = storyId;
  }
}