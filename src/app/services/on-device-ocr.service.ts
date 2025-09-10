import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class OnDeviceOcrService {
  private session: ort.InferenceSession | null = null;
  private modelPath = '/assets/ocr_model.onnx'; // Placeholder path for an ONNX OCR model

  constructor(private notificationService: NotificationService) {
    // Initialize the ONNX Runtime Web environment
    ort.env.wasm.wasmPaths = '/'; // Assuming wasm files are in the root
    this.loadModel();
  }

  private async loadModel(): Promise<void> {
    try {
      // In a real scenario, you would load a pre-trained ONNX model here.
      // For this implementation, we'll simulate a successful load.
      // Example: this.session = await ort.InferenceSession.create(this.modelPath);
      console.log('Simulating ONNX OCR model loading...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading time
      this.session = {} as ort.InferenceSession; // Placeholder for a loaded session
      this.notificationService.showInfo('On-device OCR model loaded (simulated).', 'On-Device AI');
    } catch (e) {
      console.error('Failed to load ONNX OCR model:', e);
      this.notificationService.showError('Failed to load on-device OCR model. Falling back to cloud OCR.', 'On-Device AI Error');
      this.session = null;
    }
  }

  public isModelLoaded(): boolean {
    return this.session !== null;
  }

  public async recognize(imageDataUrl: string, signal: AbortSignal): Promise<string> {
    if (signal.aborted) throw new Error('Operation aborted');

    if (!this.isModelLoaded()) {
      throw new Error('On-device OCR model not loaded.');
    }

    // In a real implementation, you would preprocess the imageDataUrl (e.g., convert to tensor)
    // and then run inference using this.session.run().
    // For now, we'll simulate a recognition result.
    console.log('Simulating on-device OCR recognition...');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time

    if (signal.aborted) throw new Error('Operation aborted');

    // Generate a dummy OCR text based on the image data URL (very basic simulation)
    const dummyText = `Simulated On-Device OCR Result:\nProduct Name: Healthy Snack Bar\nBrand: EcoFoods\nIngredients: Oats, Dates, Nuts, Seeds, Honey\nCalories: 180`;
    
    return dummyText;
  }
}