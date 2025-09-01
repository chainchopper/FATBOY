import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from './product-db.service';

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  // Specialized services
  private ttsEndpoint = environment.ttsApiEndpoint;
  private ttsApiKey = environment.ttsApiKey;
  private suggestionsEndpoint = environment.suggestionsApiEndpoint;
  private suggestionsApiKey = environment.suggestionsApiKey;
  private metadataEndpoint = environment.metadataApiEndpoint;
  private metadataApiKey = environment.metadataApiKey;

  // OpenAI-like service
  private openaiApiBaseUrl = environment.openaiApiBaseUrl;
  private openaiApiKey = environment.openaiApiKey;
  private visionModelName = environment.visionModelName;

  constructor(private http: HttpClient) { }

  /**
   * Analyzes an image using a vision model (e.g., moondream2).
   * @param imageUrl The URL of the image to analyze (can be a data URL).
   * @param prompt The text prompt to guide the analysis.
   * @returns A promise that resolves with the model's response.
   */
  async analyzeImageWithVisionModel(imageUrl: string, prompt: string): Promise<any> {
    const endpoint = `${this.openaiApiBaseUrl}/chat/completions`;
    if (!endpoint || !this.visionModelName) {
      console.warn('Vision model endpoint or name not configured.');
      return null;
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(this.openaiApiKey && { 'Authorization': `Bearer ${this.openaiApiKey}` })
    });

    const payload = {
      model: this.visionModelName,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 300
    };

    try {
      const response = await lastValueFrom(this.http.post<any>(endpoint, payload, { headers }));
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Vision Model API Error:', error);
      return null;
    }
  }

  // --- Existing Methods ---

  async getSuggestions(userHistory: Product[]): Promise<any[]> {
    if (!this.suggestionsEndpoint || !this.suggestionsApiKey) {
      console.warn('Suggestions API endpoint or key not configured.');
      return [];
    }
    try {
      const response = await lastValueFrom(this.http.post<any[]>(this.suggestionsEndpoint, { history: userHistory }, {
        headers: { 'Authorization': `Bearer ${this.suggestionsApiKey}` }
      }));
      return response;
    } catch (error) {
      console.error('Suggestions API Error:', error);
      return [];
    }
  }

  async getMetadata(query: string): Promise<any> {
    if (!this.metadataEndpoint || !this.metadataApiKey) {
      console.warn('Metadata API endpoint or key not configured.');
      return null;
    }
    try {
      const response = await lastValueFrom(this.http.post<any>(this.metadataEndpoint, { query }, {
        headers: { 'Authorization': `Bearer ${this.metadataApiKey}` }
      }));
      return response;
    } catch (error) {
      console.error('Metadata API Error:', error);
      return null;
    }
  }

  async textToSpeech(text: string): Promise<AudioBuffer | null> {
    if (!this.ttsEndpoint || !this.ttsApiKey) {
      console.warn('TTS API endpoint or key not configured.');
      return null;
    }
    try {
      const response = await lastValueFrom(this.http.post(this.ttsEndpoint, { text }, {
        headers: { 'Authorization': `Bearer ${this.ttsApiKey}` },
        responseType: 'arraybuffer'
      }));
      const audioContext = new AudioContext();
      return await audioContext.decodeAudioData(response);
    } catch (error) {
      console.error('TTS API Error:', error);
      return null;
    }
  }
}