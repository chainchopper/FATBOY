import { Injectable, EventEmitter } from '@angular/core';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class StabilityDetectorService {
  private stabilityCheckInterval: any;
  private lastFrame: ImageData | null = null;
  private stabilityThreshold = 500000; // Adjust as needed
  private stableCounter = 0;
  private requiredStableFrames = 3; // Number of consecutive stable frames needed

  public isStable = false;
  public stableFrameCaptured = new EventEmitter<void>();

  constructor(private notificationService: NotificationService) {}

  public start(getVideoElement: () => HTMLVideoElement | null, getCanvasElement: () => HTMLCanvasElement): void {
    this.stop(); // Ensure any previous interval is cleared
    this.stableCounter = 0;
    this.isStable = false;
    this.lastFrame = null;

    this.stabilityCheckInterval = setInterval(() => {
      this.checkForStability(getVideoElement, getCanvasElement);
    }, 500); // Check every 500ms
  }

  public stop(): void {
    if (this.stabilityCheckInterval) {
      clearInterval(this.stabilityCheckInterval);
      this.stabilityCheckInterval = null;
    }
    this.lastFrame = null;
    this.stableCounter = 0;
    this.isStable = false;
  }

  private checkForStability(getVideoElement: () => HTMLVideoElement | null, getCanvasElement: () => HTMLCanvasElement): void {
    const video = getVideoElement();
    if (!video || video.readyState < video.HAVE_METADATA) return;

    const canvas = getCanvasElement();
    const scale = 0.25; // Scale down for faster processing
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (this.lastFrame) {
      let diff = 0;
      for (let i = 0; i < currentFrame.data.length; i += 4) { // Compare only red channel for simplicity
        diff += Math.abs(currentFrame.data[i] - this.lastFrame.data[i]);
      }

      if (diff < this.stabilityThreshold) {
        this.stableCounter++;
      } else {
        this.stableCounter = 0;
      }
    }

    this.lastFrame = currentFrame;
    this.isStable = this.stableCounter > 0;

    if (this.stableCounter >= this.requiredStableFrames) {
      this.notificationService.showInfo('Camera is stable, analyzing label...', 'Auto-Scan');
      this.stableFrameCaptured.emit(); // Emit event to trigger OCR capture
      this.stop(); // Stop detector after capture
    }
  }
}