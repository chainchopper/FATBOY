import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import Tesseract from 'tesseract.js';
import { OcrEnhancerService } from '../services/ocr-enhancer.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService, Product } from '../services/product-db.service';

@Component({
  selector: 'app-ocr-scanner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ocr-scanner.component.html',
  styleUrls: ['./ocr-scanner.component.css']
})
export class OcrScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  private mediaStream: MediaStream | null = null;
  isProcessing = false;
  
  private cameras: MediaDeviceInfo[] = [];
  private selectedCameraId: string | null = null;
  private currentCameraIndex = 0;

  constructor(
    private router: Router,
    private ocrEnhancer: OcrEnhancerService,
    private ingredientParser: IngredientParserService,
    private productDb: ProductDbService
  ) {}

  async ngAfterViewInit() {
    await this.setupCameras();
    this.startCamera();
  }

  private async setupCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.cameras = devices.filter(device => device.kind === 'videoinput');
      if (this.cameras.length === 0) {
        alert('No cameras found.');
        return;
      }
      
      const savedCameraId = localStorage.getItem('fatBoySelectedCamera');
      const savedIndex = this.cameras.findIndex(c => c.deviceId === savedCameraId);
      
      this.currentCameraIndex = savedIndex !== -1 ? savedIndex : 0;
      this.selectedCameraId = this.cameras[this.currentCameraIndex].deviceId;

    } catch (error) {
      console.error('Error setting up cameras:', error);
    }
  }

  private async startCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: { deviceId: this.selectedCameraId ? { exact: this.selectedCameraId } : undefined, facingMode: 'environment' },
        audio: false
      };
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = this.videoElement.nativeElement;
      video.srcObject = this.mediaStream;
      await video.play();
    } catch (error) {
      console.error('Error accessing camera for OCR:', error);
      alert('Unable to access camera. Please allow camera permissions and try again.');
    }
  }

  switchCamera() {
    if (this.cameras.length > 1) {
      this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
      this.selectedCameraId = this.cameras[this.currentCameraIndex].deviceId;
      localStorage.setItem('fatBoySelectedCamera', this.selectedCameraId);
      this.startCamera();
    }
  }

  async captureImage(): Promise<void> {
    if (this.isProcessing) return;
    // ... (rest of the captureImage method is unchanged)
  }

  private processExtractedText(text: string): void {
    // ... (rest of the processExtractedText method is unchanged)
  }

  ngOnDestroy(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }
}