import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import Tesseract from 'tesseract.js';
import { OcrEnhancerService } from '../services/ocr-enhancer.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { NotificationService } from '../services/notification.service';

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
    private productDb: ProductDbService,
    private notificationService: NotificationService
  ) {}

  async ngAfterViewInit() {
    await this.setupCameras();
    if (this.cameras.length > 0) {
      this.startCamera();
    }
  }

  private async setupCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.cameras = devices.filter(device => device.kind === 'videoinput');
      if (this.cameras.length === 0) {
        this.notificationService.showError('No cameras found on this device.');
        return;
      }
      
      const savedCameraId = localStorage.getItem('fatBoySelectedCamera');
      const savedIndex = this.cameras.findIndex(c => c.deviceId === savedCameraId);
      
      this.currentCameraIndex = savedIndex !== -1 ? savedIndex : 0;
      this.selectedCameraId = this.cameras[this.currentCameraIndex].deviceId;

    } catch (error) {
      console.error('Error setting up cameras:', error);
      this.notificationService.showError('Could not enumerate camera devices.');
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
      this.notificationService.showError('Unable to access camera. Please allow permissions.');
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
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    if (!video.videoWidth || !video.videoHeight) {
      this.notificationService.showWarning('Camera not ready yet. Please try again.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.isProcessing = true;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const result = await Tesseract.recognize(dataUrl, 'eng');
      const text = result.data?.text || '';

      if (!text || text.trim().length === 0) {
        this.notificationService.showWarning('No text detected. Please adjust lighting and try again.');
        this.isProcessing = false;
        return;
      }

      this.processExtractedText(text);
    } catch (err) {
      console.error('OCR error:', err);
      this.notificationService.showError('Failed to process the image. Please try again.');
      this.isProcessing = false;
    }
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