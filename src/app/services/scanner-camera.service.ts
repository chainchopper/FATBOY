import { Injectable, EventEmitter } from '@angular/core';
import { Html5Qrcode, Html5QrcodeResult } from 'html5-qrcode';
import { NotificationService } from './notification.service';
import { PermissionsService } from './permissions.service';
import { AudioService } from './audio.service';

@Injectable({
  providedIn: 'root'
})
export class ScannerCameraService {
  private html5QrcodeScanner: Html5Qrcode | null = null;
  private selectedCameraId: string | null = null;
  private currentCameraIndex = 0;
  public cameras: MediaDeviceInfo[] = [];
  private isPausedInternally: boolean = false; // New flag to track internal pause state

  public barcodeScanned = new EventEmitter<string>();
  public barcodeScanError = new EventEmitter<string>();
  public cameraStarted = new EventEmitter<boolean>();
  public cameraStopped = new EventEmitter<void>();

  constructor(
    private notificationService: NotificationService,
    private permissionsService: PermissionsService,
    private audioService: AudioService
  ) {}

  private async initializeHtml5Qrcode(readerElementId: string): Promise<void> {
    if (!this.html5QrcodeScanner) {
      this.html5QrcodeScanner = new Html5Qrcode(readerElementId);
    }
    await this.setupCameras();
  }

  private async setupCameras(): Promise<void> {
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

  public async startScanning(readerElementId: string): Promise<boolean> {
    const hasCameraPermission = await this.permissionsService.checkAndRequestCameraPermission();
    if (!hasCameraPermission) {
      this.notificationService.showError('Camera access is required to use the scanner.');
      return false;
    }

    await this.initializeHtml5Qrcode(readerElementId);

    if (!this.html5QrcodeScanner || !this.selectedCameraId) {
      this.notificationService.showError('Scanner not initialized or no camera selected.');
      return false;
    }

    try {
      const cameraConfig = { deviceId: { exact: this.selectedCameraId } };
      await this.html5QrcodeScanner.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText, decodedResult) => this.barcodeScanned.emit(decodedText),
        (errorMessage) => this.barcodeScanError.emit(errorMessage)
      );
      this.isPausedInternally = false; // Ensure not paused when starting
      this.cameraStarted.emit(true);
      return true;
    } catch (error) {
      console.error('Error starting camera for scanning:', error);
      this.notificationService.showError('Failed to start camera for scanning.');
      this.cameraStarted.emit(false);
      return false;
    }
  }

  public async stopScanning(): Promise<void> {
    if (this.html5QrcodeScanner && (this.html5QrcodeScanner as any).isScanning()) { // Corrected with 'any' cast
      try {
        await this.html5QrcodeScanner.stop();
        this.html5QrcodeScanner.clear();
        this.isPausedInternally = true; // Mark as paused when stopped
        this.cameraStopped.emit();
      } catch (error) {
        console.error('Error stopping scanner:', error);
        this.notificationService.showError('Failed to stop scanner.');
      }
    }
  }

  public async pauseDetection(): Promise<void> {
    if (this.html5QrcodeScanner && (this.html5QrcodeScanner as any).isScanning() && !this.isPausedInternally) { // Corrected with 'any' cast
      await this.stopScanning(); // Stop the camera stream
      this.isPausedInternally = true;
    }
  }

  public async resumeDetection(): Promise<void> {
    if (this.html5QrcodeScanner && this.isPausedInternally) {
      await this.startScanning('reader'); // Corrected to pass 'reader' directly
      this.isPausedInternally = false;
    }
  }

  public async switchCamera(): Promise<void> {
    if (this.cameras.length < 2) {
      this.notificationService.showInfo('No other camera found.');
      return;
    }
    
    await this.stopScanning(); // Stop current stream to switch
    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
    this.selectedCameraId = this.cameras[this.currentCameraIndex].deviceId;
    localStorage.setItem('fatBoySelectedCamera', this.selectedCameraId);
    this.notificationService.showSuccess(`Switched to ${this.cameras[this.currentCameraIndex].label}`);
    await this.startScanning('reader'); // Restart with new camera
  }

  public getLastFrameImageData(): ImageData | null {
    if (this.html5QrcodeScanner && (this.html5QrcodeScanner as any).isScanning()) { // Corrected with 'any' cast
      const videoElement = (this.html5QrcodeScanner as any).getVideoElement(); // Retain as any for internal method
      if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          return ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
      }
    }
    return null;
  }

  public getVideoElement(): HTMLVideoElement | null {
    if (this.html5QrcodeScanner && (this.html5QrcodeScanner as any).isScanning()) { // Corrected with 'any' cast
      return (this.html5QrcodeScanner as any).getVideoElement(); // Retain as any for internal method
    }
    return null;
  }

  public isScanning(): boolean {
    return (this.html5QrcodeScanner as any)?.isScanning() || false; // Corrected with 'any' cast
  }
}