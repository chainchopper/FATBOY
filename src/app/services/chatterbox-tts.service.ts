import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';
import { PreferencesService, UserPreferences } from './preferences.service';
import { environment } from '../../environments/environment';

export interface ChatterboxVoice {
  id: string;
  name: string;
  language: string;
  gender?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatterboxTtsService {
  private ttsApiUrl: string;
  private voicesApiUrl: string;
  private healthApiUrl: string;
  private defaultVoice = 'KEVIN';
  private maxRetries = 2;

  private availableVoices: ChatterboxVoice[] = [];
  private isApiAvailable = false;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private preferencesService: PreferencesService
  ) {
    if (!environment.ttsApiEndpoint || environment.ttsApiEndpoint === 'your_tts_api_endpoint_here') {
      console.warn('Chatterbox TTS API endpoint is not configured in environment. Falling back to on-device TTS.');
      this.ttsApiUrl = '';
      this.voicesApiUrl = '';
      this.healthApiUrl = '';
      this.isApiAvailable = false;
    } else {
      this.ttsApiUrl = `${environment.ttsApiEndpoint}/v1/audio/speech`;
      this.voicesApiUrl = `${environment.ttsApiEndpoint}/v1/audio/voices`; // corrected path
      this.healthApiUrl = `${environment.ttsApiEndpoint}/v1/health`;
      this.checkApiHealthAndLoadVoices();
    }
  }

  private async checkApiHealthAndLoadVoices(): Promise<void> {
    if (!this.healthApiUrl) return;
    try {
      const healthResponse = await firstValueFrom(this.http.get<any>(this.healthApiUrl));
      if (healthResponse.status !== 'healthy') {
        this.notificationService.showWarning(`Chatterbox TTS API: Status is '${healthResponse.status}'.`, 'TTS Warning');
      }
      this.isApiAvailable = true;
      await this.fetchAvailableVoices();
    } catch (error) {
      console.error('Error checking Chatterbox TTS API health:', error);
      this.isApiAvailable = false;
      this.availableVoices = [];
      this.notificationService.showError('Chatterbox TTS API unreachable. Falling back to on-device speech.', 'TTS Error');
    }
  }

  private async fetchAvailableVoices(): Promise<void> {
    if (!this.voicesApiUrl || !this.isApiAvailable) {
      this.availableVoices = [];
      return;
    }
    try {
      const voicesResponse = await firstValueFrom(this.http.get<ChatterboxVoice[]>(this.voicesApiUrl));
      this.availableVoices = voicesResponse || [];
    } catch (error) {
      console.error('Error fetching Chatterbox TTS voices:', error);
      this.availableVoices = [];
    }
  }

  getAvailableVoices(): ChatterboxVoice[] {
    return this.availableVoices;
  }

  async speak(text: string, voiceId?: string): Promise<void> {
    const preferences = this.preferencesService.getPreferences();

    if (!preferences.enableVoiceCommands) {
      return;
    }

    const selectedVoice = voiceId || preferences.chatterboxVoiceId || this.defaultVoice;

    if (preferences.useOnDeviceTts || !this.isApiAvailable) {
      this.speakOnDevice(text);
      return;
    }

    for (let i = 0; i <= this.maxRetries; i++) {
      try {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        const payload = { input: text, voice: selectedVoice };

        const audioBlob = await firstValueFrom(
          this.http.post(this.ttsApiUrl, payload, { responseType: 'blob', headers })
        );

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        return;
      } catch (error) {
        console.error(`Chatterbox TTS API call failed (attempt ${i + 1}/${this.maxRetries + 1}):`, error);
        if (error instanceof HttpErrorResponse && error.status === 0) {
          this.notificationService.showError('Chatterbox TTS API unreachable or CORS blocked.', 'TTS Connection Error');
        } else if (i === this.maxRetries) {
          this.notificationService.showWarning('Chatterbox TTS unavailable. Falling back to on-device speech.', 'TTS Error');
        }
        this.speakOnDevice(text);
      }
    }
  }

  private speakOnDevice(text: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('On-device TTS not available.');
    }
  }
}