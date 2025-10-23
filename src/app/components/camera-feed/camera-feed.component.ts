import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationService } from '../../services/notification.service';
import { PermissionsService } from '../../services/permissions.service';
import { AudioService } from '../../services/audio.service';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-camera-feed',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="relative w-full h-[300px] bg-black rounded-lg overflow-hidden mb-4 border border-[#4a4a6e]">
      <div id="reader-{{instanceId}}" #readerElement class="w-full h-full flex justify-center items-center"></div>
      <canvas #canvasElement class="hidden"></canvas>

      <div class="absolute bottom-0 left-0 right-0 bg-gray-900/70 backdrop-blur-sm p-2.5 flex justify-around gap-2.5">
        <button (click)="captureImage()" class="bg-transparent border border-teal-500 text-teal-400 px-3 py-2 rounded-full cursor-pointer flex flex-col items-center text-xs transition-all duration-300 hover:bg-teal-900/20 hover:shadow-lg hover:shadow-teal-500/50" title="Capture Image">
          <lucide-icon name="camera" [size]="24"></lucide-icon>
          <span>Capture</span>
        </button>
        <button (click)="toggleBarcodeScanning()" class="bg-transparent border border-teal-500 text-teal-400 px-3 py-2 rounded-full cursor-pointer flex flex-col items-center text-xs transition-all duration-300 hover:bg-teal-900/20 hover:shadow-lg hover:shadow-teal-500/50" title="Toggle Barcode Scan">
          <lucide-icon [name]="isBarcodeScanning ? 'barcode' : 'scan-line'" [size]="24"></lucide-icon>
          <span>{{ isBarcodeScanning ? 'Barcode ON' : 'Barcode OFF' }}</span>
        </button>
        <button (click)="switchCamera()" class="bg-transparent border border-teal-500 text-teal-400 px-3 py-2 rounded-full cursor-pointer flex flex-col items-center text-xs transition-all duration-300 hover:bg-teal-900/20 hover:shadow-lg hover:shadow-teal-500/50" title="Switch Camera">
          <lucide-icon name="rotate-ccw" [size]="24"></lucide-icon>
          <span>Switch</span>
        </button>
        <button (click)="closeCamera()" class="bg-transparent border border-red-500 text-red-500 px-3 py-2 rounded-full cursor-pointer flex flex-col items-center text-xs transition-all duration-300 hover:bg-red-900/10 hover:shadow-lg hover:shadow-red-500/50" title="Close Camera">
          <lucide-icon name="x" [size]="24"></lucide-icon>
          <span>Close</span>
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class CameraFeedComponent implements AfterViewInit, OnDestroy {
  @ViewChild('readerElement') readerElement!: ElementRef;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  @Input() instanceId: string = 'default';
  @Output() barcodeScanned = new EventEmitter<string>();
  @Output() imageCaptured = new EventEmitter<string>();
  @Output() cameraClosed = new EventEmitter<void>();

  private html5QrcodeScanner: Html5Qrcode | null = null;
  private selectedCameraId: string | null = null;
  private currentCameraIndex = 0;
  public cameras: MediaDeviceInfo[] = [];
  public isBarcodeScanning = true;
  private _isScanning: boolean = false;

  constructor(
    private notificationService: NotificationService,
    private permissionsService: PermissionsService,
    private audioService: AudioService
  ) {}

  async ngAfterViewInit() {
    await this.initializeCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  private async initializeCamera(): Promise<void> {
    const hasCameraPermission = await this.permissionsService.checkAndRequestCameraPermission();
    if (!hasCameraPermission) {
      this.notificationService.showError('Camera access is required.');
      this.cameraClosed.emit();
      return;
    }

    if (!this.html5QrcodeScanner) {
      this.html5QrcodeScanner = new Html5Qrcode(`reader-${this.instanceId}`);
    }

    await this.setupCameras();

    if (!this.selectedCameraId) {
      this.notificationService.showError('No camera available to start.');
      this.cameraClosed.emit();
      return;
    }

    await this.startCamera();
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

  private async startCamera(): Promise<void> {
    if (!this.html5QrcodeScanner || !this.selectedCameraId) return;

    try {
      await this.html5QrcodeScanner.start(
        { deviceId: { exact: this.selectedCameraId } },
        { fps: 10, qrbox: { width: 200, height: 150 } },
        (decodedText, _decodedResult) => {
          if (this.isBarcodeScanning) {
            this.barcodeScanned.emit(decodedText);
            this.audioService.playSuccessSound();
            if (typeof (this.html5QrcodeScanner as any).pause === 'function') {
              (this.html5QrcodeScanner as any).pause();
            } else if (typeof (this.html5QrcodeScanner as any).stop === 'function') {
              (this.html5QrcodeScanner as any).stop();
            }
            this._isScanning = false;
          }
        },
        (_errorMessage) => {
          // suppress frequent scan errors
        }
      );
      this._isScanning = true;
      this.notificationService.showInfo('Camera started.', 'Live Feed');
    } catch (error) {
      console.error('Error starting camera:', error);
      this.notificationService.showError('Failed to start camera feed.');
      this.cameraClosed.emit();
      this._isScanning = false;
    }
  }

  private async stopCamera(): Promise<void> {
    try {
      const libHasIsScanning = typeof (this.html5QrcodeScanner as any)?.isScanning === 'function';
      const libIsScanning = libHasIsScanning ? (this.html5QrcodeScanner as any).isScanning() : this._isScanning;

      if (this.html5QrcodeScanner && libIsScanning) {
        if (typeof (this.html5QrcodeScanner as any).stop === 'function') {
          await this.html5QrcodeScanner.stop();
          this.html5QrcodeScanner.clear();
        }
      }
      this._isScanning = false;
      this.notificationService.showInfo('Camera stopped.', 'Live Feed');
    } catch {
      // silent
    }
  }

  public async switchCamera(): Promise<void> {
    if (this.cameras.length < 2) {
      this.notificationService.showInfo('No other camera found.');
      return;
    }
    await this.stopCamera();
    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
    this.selectedCameraId = this.cameras[this.currentCameraIndex].deviceId;
    localStorage.setItem('fatBoySelectedCamera', this.selectedCameraId);
    this.notificationService.showSuccess(`Switched to ${this.cameras[this.currentCameraIndex].label}`);
    await this.startCamera();
  }

  public captureImage(): void {
    try {
      const videoElement = (this.html5QrcodeScanner as any)?.getVideoElement?.() || (this.html5QrcodeScanner as any)?.videoElement;
      if (videoElement && this.canvasElement) {
        const canvas = this.canvasElement.nativeElement;
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const imageDataUrl = canvas.toDataURL('image/png');
          this.imageCaptured.emit(imageDataUrl);
          this.audioService.playSuccessSound();
          this.notificationService.showInfo('Image captured!', 'OCR Ready');
        }
      } else {
        this.notificationService.showError('Camera not active for image capture.');
      }
    } catch (e) {
      console.error('captureImage error:', e);
      this.notificationService.showError('Capture failed.');
    }
  }

  public toggleBarcodeScanning(): void {
    this.isBarcodeScanning = !this.isBarcodeScanning;
    if (this.isBarcodeScanning) {
      if (this.html5QrcodeScanner && typeof (this.html5QrcodeScanner as any).resume === 'function') {
        (this.html5QrcodeScanner as any).resume();
        this._isScanning = true;
      } else if (this.html5QrcodeScanner && !this._isScanning) {
        this.startCamera();
      }
      this.notificationService.showInfo('Barcode scanning enabled.', 'Scanner Mode');
    } else {
      if (this.html5QrcodeScanner && typeof (this.html5QrcodeScanner as any).pause === 'function') {
        (this.html5QrcodeScanner as any).pause();
      } else if (this.html5QrcodeScanner && typeof (this.html5QrcodeScanner as any).stop === 'function') {
        (this.html5QrcodeScanner as any).stop();
      }
      this._isScanning = false;
      this.notificationService.showInfo('Barcode scanning disabled.', 'Scanner Mode');
    }
  }

  public resumeBarcodeScanning(): void {
    if (!this.isBarcodeScanning) return;
    if (this.html5QrcodeScanner && !this._isScanning) {
      if (typeof (this.html5QrcodeScanner as any).resume === 'function') {
        (this.html5QrcodeScanner as any).resume();
        this._isScanning = true;
      } else {
        this.startCamera();
      }
    }
  }

  public closeCamera(): void {
    this.stopCamera();
    this.cameraClosed.emit();
  }
}