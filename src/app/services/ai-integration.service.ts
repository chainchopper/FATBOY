import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from './product-db.service';

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  private ttsEndpoint = environment.ttsApiEndpoint;
  private ttsApiKey = environment.ttsApiKey;
  private suggestionsEndpoint = environment.suggestionsApiEndpoint;
  private suggestionsApiKey = environment.suggestionsApiKey;
  private metadataEndpoint = environment.metadataApiEndpoint;
  private metadataApiKey = environment.metadataApiKey;

  constructor(private http: HttpClient) { }

  /**
   * Converts text to speech using the TTS API.
   * @param text The text to synthesize.
   * @returns A promise that resolves with an AudioBuffer.
   */
  async textToSpeech(text: string): Promise<AudioBuffer | null> {
    if (!this.ttsEndpoint || !this.ttsApiKey) {
      console.warn('TTS API endpoint or key not configured.');
      return null;
    }
    // This is a placeholder implementation. The actual request will depend on your API.
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

  /**
   * Gets personalized product suggestions from the suggestions agent.
   * @param userHistory A list of the user's recently scanned/saved products.
   * @returns A promise that resolves with an array of suggested products.
   */
  async getSuggestions(userHistory: Product[]): Promise<any[]> {
    if (!this.suggestionsEndpoint || !this.suggestionsApiKey) {
      console.warn('Suggestions API endpoint or key not configured.');
      return []; // Return empty array if not configured
    }
    // This is a placeholder implementation.
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

  /**
   * Fetches additional metadata for a given ingredient or product from the web scraping agent.
   * @param query The ingredient or product name to look up.
   * @returns A promise that resolves with the fetched metadata.
   */
  async getMetadata(query: string): Promise<any> {
    if (!this.metadataEndpoint || !this.metadataApiKey) {
      console.warn('Metadata API endpoint or key not configured.');
      return null;
    }
    // This is a placeholder implementation.
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
}