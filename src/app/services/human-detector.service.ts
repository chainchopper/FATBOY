import { Injectable } from '@angular/core';
import { NotificationService } from './notification.service';
import { SpeechService } from './speech.service';
import { AudioService } from './audio.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HumanDetectorService {
  private humanDetectionInterval: any;
  private lastHumanDetectionTime = 0;
  private humanDetectionCooldown = 5000; // 5 seconds cooldown

  private apiBaseUrl = environment.openaiApiBaseUrl;
  private apiKey = environment.openaiApiKey;
  private visionModelName = environment.visionModelName;

  constructor(
    private notificationService: NotificationService,
    private speechService: SpeechService,
    private audioService: AudioService
  ) { }

  public startDetection(getVideoElement: () => HTMLVideoElement | null, getCanvasElement: () => HTMLCanvasElement): void {
    this.stopDetection();
    this.humanDetectionInterval = setInterval(() => {
      this.detectHuman(getVideoElement, getCanvasElement);
    }, 2000); // Check every 2 seconds
  }

  public stopDetection(): void {
    if (this.humanDetectionInterval) {
      clearInterval(this.humanDetectionInterval);
      this.humanDetectionInterval = null;
    }
  }

  private async detectHuman(getVideoElement: () => HTMLVideoElement | null, getCanvasElement: () => HTMLCanvasElement): Promise<void> {
    if (Date.now() - this.lastHumanDetectionTime < this.humanDetectionCooldown) return; // Cooldown

    const video = getVideoElement();
    if (!video || video.readyState < video.HAVE_METADATA) return;

    const canvas = getCanvasElement();
    const scale = 0.5; // Scale down for faster processing
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7); // Use JPEG for smaller size

    const endpoint = `${this.apiBaseUrl}/v1/chat/completions`; // Ensure /v1 prefix
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: this.visionModelName, // Use configurable model name
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Is there a human in this image? If yes, describe them briefly (e.g., "a person wearing a red shirt"). If no human, just say "no human".' }, // Simplified prompt
                { type: 'image_url', image_url: { url: imageDataUrl } }
              ]
            }
          ],
          max_tokens: 60,
          temperature: 0.7 // Slightly lower temperature for more factual response
        })
      });

      if (!response.ok) {
        throw new Error(`Vision API Error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      // Robust checks for response structure
      if (!data || !Array.isArray(data.choices) || data.choices.length === 0 || !data.choices[0].message?.content) {
        console.error(`Vision API Error: Unexpected response structure for chat completions endpoint:`, data);
        throw new Error('Invalid response from Vision API.');
      }
      const aiResponse = data.choices[0].message.content;

      if (aiResponse && aiResponse.toLowerCase().includes('no human')) {
        // console.log('No human detected.'); // Keep silent for no human
      } else if (aiResponse) {
        this.notificationService.showInfo(aiResponse, 'Human Detected!');
        this.speechService.speak(aiResponse);
        this.lastHumanDetectionTime = Date.now(); // Reset cooldown
      }

    } catch (error) {
      console.error('Error detecting human with Vision API:', error);
      // this.notificationService.showError('Failed to detect human.', 'Vision Error'); // Avoid spamming notifications
    }
  }
}