import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from './product-db.service';
import { InferenceSession, Tensor } from 'onnxruntime-web';
import { HfInference } from '@huggingface/inference';

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {

  // OpenAI-like service
  private openaiApiBaseUrl = environment.openaiApiBaseUrl;
  private openaiApiKey = environment.openaiApiKey;
  private visionModelName = environment.visionModelName;

  // ONNX session for on-device inference
  private onnxSession: InferenceSession | null = null;

  // Hugging Face client
  private hf: HfInference;

  constructor(private http: HttpClient) {
    // Initialize Hugging Face client if a token is provided
    // In a real app, you'd get this from a secure source
    const hfToken = ''; // Placeholder for a Hugging Face token
    this.hf = new HfInference(hfToken);
  }

  /**
   * Initializes an ONNX session for on-device inference.
   * @param modelUrl The URL to the .onnx model file.
   */
  async initializeOnnxSession(modelUrl: string): Promise<void> {
    try {
      this.onnxSession = await InferenceSession.create(modelUrl);
      console.log('ONNX session initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize ONNX session:', error);
    }
  }

  /**
   * Runs on-device inference using the loaded ONNX model.
   * This is a placeholder and needs to be implemented based on the specific model's inputs/outputs.
   * @param inputData The pre-processed input tensor for the model.
   * @returns The model's output tensor.
   */
  async runOnDeviceInference(inputData: Tensor): Promise<any> {
    if (!this.onnxSession) {
      throw new Error('ONNX session not initialized. Call initializeOnnxSession first.');
    }
    try {
      const feeds = { [this.onnxSession.inputNames[0]]: inputData };
      const results = await this.onnxSession.run(feeds);
      return results[this.onnxSession.outputNames[0]];
    } catch (error) {
      console.error('On-device inference failed:', error);
      return null;
    }
  }

  /**
   * Analyzes an image using a cloud-based vision model (e.g., moondream2).
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
}