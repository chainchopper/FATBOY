import { Injectable, EventEmitter } from '@angular/core';
import { Html5Qrcode } from 'html5-qrcode';
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

  private _isScanning: boolean = false; // Internal scanning flag

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
      this._isScanning = true;
      this.isPausedInternally = false; // Ensure not paused when starting
      this.cameraStarted.emit(true);
      return true;
    } catch (error) {
      console.error('Error starting camera for scanning:', error);
      this.notificationService.showError('Failed to start camera for scanning.');
      this.cameraStarted.emit(false);
      this._isScanning = false;
      return false;
    }
  }

  public async stopScanning(): Promise<void> {
    try {
      // Prefer library's stop if available
      if (this.html5QrcodeScanner) {
        // Some versions may not expose isScanning(), so rely on internal flag as fallback
        const libHasIsScanning = typeof (this.html5QrcodeScanner as any).isScanning === 'function';
        const libIsScanning = libHasIsScanning ? (this.html5QrcodeScanner as any).isScanning() : this._isScanning;

        if (libIsScanning) {
          await this.html5QrcodeScanner.stop();
          this.html5QrcodeScanner.clear();
        }
      }
      this._isScanning = false;
      this.isPausedInternally = true; // Mark as paused when stopped
      this.cameraStopped.emit();
    } catch (error) {
      console.error('Error stopping scanner:', error);
      this.notificationService.showError('Failed to stop scanner.');
    }
  }

  public async pauseDetection(): Promise<void> {
    try {
      const libHasIsScanning = typeof (this.html5QrcodeScanner as any)?.isScanning === 'function';
      const libIsScanning = libHasIsScanning ? (this.html5QrcodeScanner as any).isScanning() : this._isScanning;

      if (this.html5QrcodeScanner && libIsScanning && !this.isPausedInternally) {
        // stop() can be used to pause in many implementations; preserve internal flag
        await this.stopScanning();
        this.isPausedInternally = true;
      }
    } catch (error) {
      console.error('Error pausing detection:', error);
    }
  }

  public async resumeDetection(): Promise<void> {
    if (this.html5QrcodeScanner && this.isPausedInternally) {
      await this.startScanning('reader'); // Restart scanning with same reader Id
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
    try {
      const isScanning = (typeof (this.html5QrcodeScanner as any)?.isScanning === 'function')
        ? (this.html5QrcodeScanner as any).isScanning()
        : this._isScanning;

      if (this.html5QrcodeScanner && isScanning) {
        const videoElement = (this.html5QrcodeScanner as any).getVideoElement?.() || (this.html5QrcodeScanner as any).getRunningTrack?.();
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
    } catch (e) {
      console.warn('getLastFrameImageData fallback triggered:', e);
    }
    return null;
  }

  public getVideoElement(): HTMLVideoElement | null {
    try {
      const isScanning = (typeof (this.html5QrcodeScanner as any)?.isScanning === 'function')
        ? (this.html5QrcodeScanner as any).isScanning()
        : this._isScanning;

      if (this.html5QrcodeScanner && isScanning) {
        // Many versions provide getVideoElement() internally; use it if available
        const fn = (this.html5QrcodeScanner as any).getVideoElement;
        if (typeof fn === 'function') {
          return fn.call(this.html5QrcodeScanner) as HTMLVideoElement;
        } else {
          // Try to access internal region where video element exists
          const el = (this.html5QrcodeScanner as any).cameraConfig?.videoElement || (this.html5QrcodeScanner as any).videoElement;
          return el || null;
        }
      }
    } catch (e) {
      console.warn('getVideoElement fallback triggered:', e);
    }
    return null;
  }

  public isScanning(): boolean {
    const libHasIsScanning = typeof (this.html5QrcodeScanner as any)?.isScanning === 'function';
    return libHasIsScanning ? (this.html5QrcodeScanner as any).isScanning() : this._isScanning;
  }
}