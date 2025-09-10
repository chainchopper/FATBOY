import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';
import { PreferencesService, UserPreferences } from './preferences.service';
import { environment } from '../../environments/environment'; // Import environment

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
  private defaultVoice = 'KEVIN'; // Default voice as requested
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
      this.ttsApiUrl = ''; // Set to empty to disable API calls
      this.voicesApiUrl = '';
      this.healthApiUrl = '';
      this.isApiAvailable = false;
    } else {
      this.ttsApiUrl = environment.ttsApiEndpoint;
      this.voicesApiUrl = this.ttsApiUrl.replace('/speech', '/voices');
      this.healthApiUrl = this.ttsApiUrl.replace('/speech', '/health');
      this.checkApiHealthAndLoadVoices();
    }
  }

  private async checkApiHealthAndLoadVoices(): Promise<void> {
    if (!this.healthApiUrl) return; // Skip if API endpoint is not configured

    try {
      const healthResponse = await firstValueFrom(this.http.get<any>(this.healthApiUrl));
      this.isApiAvailable = healthResponse.status === 'healthy' && healthResponse.model_loaded;
      if (this.isApiAvailable) {
        await this.fetchAvailableVoices();
      } else {
        console.warn('Chatterbox TTS API is not healthy or model not loaded.');
      }
    } catch (error) {
      console.error('Error checking Chatterbox TTS API health:', error);
      this.isApiAvailable = false;
    }
  }

  private async fetchAvailableVoices(): Promise<void> {
    if (!this.voicesApiUrl) return; // Skip if API endpoint is not configured

    try {
      const voicesResponse = await firstValueFrom(this.http.get<ChatterboxVoice[]>(this.voicesApiUrl));
      this.availableVoices = voicesResponse;
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
      return; // Do not speak if voice commands are disabled
    }

    const selectedVoice = voiceId || preferences.chatterboxVoiceId || this.defaultVoice;

    if (preferences.useOnDeviceTts || !this.isApiAvailable) {
      // Fallback to on-device TTS
      this.speakOnDevice(text);
      return;
    }

    // Use Chatterbox TTS API
    for (let i = 0; i <= this.maxRetries; i++) {
      try {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        const payload = {
          input: text,
          voice: selectedVoice,
          // Add other optional parameters if needed, e.g., exaggeration, cfg_weight, temperature
        };

        const audioBlob = await firstValueFrom(
          this.http.post(this.ttsApiUrl, payload, { responseType: 'blob', headers })
        );

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        return; // Success, exit loop
      } catch (error) {
        console.error(`Chatterbox TTS API call failed (attempt ${i + 1}/${this.maxRetries + 1}):`, error);
        if (i === this.maxRetries) {
          this.notificationService.showWarning('Chatterbox TTS unavailable. Falling back to on-device speech.', 'TTS Error');
          this.speakOnDevice(text); // Fallback after all retries fail
        }
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