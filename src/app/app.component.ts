import { Component } from '@angular/core';
import { StoryGameComponent } from './story-game/story-game.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [StoryGameComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'interactive-story';
}