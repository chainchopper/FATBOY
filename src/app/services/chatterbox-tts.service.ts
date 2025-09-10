import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
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
      // Use the base URL from environment and append specific paths
      this.ttsApiUrl = `${environment.ttsApiEndpoint}/v1/speech`; // CORRECTED ENDPOINT
      this.voicesApiUrl = `${environment.ttsApiEndpoint}/v1/voices`;
      this.healthApiUrl = `${environment.ttsApiEndpoint}/v1/health`;
      this.checkApiHealthAndLoadVoices();
    }

    if (environment.ttsApiKey === 'your_tts_api_key_here') {
      console.warn('WARNING: Chatterbox TTS API Key is still a placeholder. Please update environment.ts with your actual key.');
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
        console.warn('Chatterbox TTS API is not healthy or model not loaded. Not attempting to fetch voices.'); // Added more specific message
        this.availableVoices = []; // Clear voices if API is not healthy
      }
    } catch (error) {
      console.error('Error checking Chatterbox TTS API health:', error);
      this.isApiAvailable = false;
      this.availableVoices = []; // Clear voices on error
    }
  }

  private async fetchAvailableVoices(): Promise<void> {
    // Only attempt to fetch voices if the API is available and the voices API URL is configured
    if (!this.voicesApiUrl || !this.isApiAvailable) {
      this.availableVoices = []; // Ensure voices are cleared if API is not available
      return; 
    }

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

    // Explicitly check isApiAvailable before attempting API call
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
        if (error instanceof HttpErrorResponse && error.status === 0) {
          this.notificationService.showError(
            'Chatterbox TTS API unreachable. This might be a CORS issue or the service is offline. Please check your server.',
            'TTS Connection Error'
          );
        } else if (i === this.maxRetries) {
          this.notificationService.showWarning('Chatterbox TTS unavailable. Falling back to on-device speech.', 'TTS Error');
        }
        this.speakOnDevice(text); // Fallback after all retries fail or on specific error
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