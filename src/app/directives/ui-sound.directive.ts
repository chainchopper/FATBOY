import { Directive, HostListener, Input } from '@angular/core';
import { UiSoundService } from '../services/ui-sound.service';

/**
 * UI Sound Directive
 * Add sound effects to any element with simple attributes
 * 
 * Usage:
 * <button appUiSound="click">Click me</button>
 * <button appUiSound [soundOnHover]="true">Hover me</button>
 */
@Directive({
  selector: '[appUiSound]',
  standalone: true
})
export class UiSoundDirective {
  @Input() appUiSound: 'click' | 'hover' | 'success' | 'error' | 'notification' | 'scan' | 'whoosh' = 'click';
  @Input() soundOnHover = false;

  constructor(private uiSoundService: UiSoundService) {}

  @HostListener('click')
  onClick(): void {
    this.playSound(this.appUiSound);
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.soundOnHover) {
      this.uiSoundService.playHover();
    }
  }

  private playSound(soundType: string): void {
    switch (soundType) {
      case 'click':
        this.uiSoundService.playClick();
        break;
      case 'hover':
        this.uiSoundService.playHover();
        break;
      case 'success':
        this.uiSoundService.playSuccess();
        break;
      case 'error':
        this.uiSoundService.playError();
        break;
      case 'notification':
        this.uiSoundService.playNotification();
        break;
      case 'scan':
        this.uiSoundService.playScan();
        break;
      case 'whoosh':
        this.uiSoundService.playWhoosh();
        break;
    }
  }
}
