import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Html5Qrcode } from 'html5-qrcode';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationService } from '../../services/notification.service';
import { PermissionsService } from '../../services/permissions.service';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-camera-feed',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="camera-feed-container">
      <div id="reader-{{instanceId}}" #readerElement class="barcode-reader-container"></div>
      <canvas #canvasElement class="capture-canvas" style="display: none;"></canvas>

      <div class="camera-controls">
        <button (click)="captureImage()" class="control-btn" title="Capture Image">
          <lucide-icon name="camera" [size]="24"></lucide-icon>
          <span>Capture</span>
        </button>
        <button (click)="toggleBarcodeScanning()" class="control-btn" title="Toggle Barcode Scan">
          <lucide-icon [name]="isBarcodeScanning ? 'barcode' : 'scan-line'" [size]="24"></lucide-icon>
          <span>{{ isBarcodeScanning ? 'Barcode ON' : 'Barcode OFF' }}</span>
        </button>
        <button (click)="switchCamera()" class="control-btn" title="Switch Camera">
          <lucide-icon name="rotate-ccw" [size]="24"></lucide-icon>
          <span>Switch</span>
        </button>
        <button (click)="closeCamera()" class="control-btn close-btn" title="Close Camera">
          <lucide-icon name="x" [size]="24"></lucide-icon>
          <span>Close</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .camera-feed-container {
      position: relative;
      width: 100%;
      height: 300px; /* Fixed height for chat integration */
      background-color: #000;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 15px;
      border: 1px solid #4a4a6e;
    }
    .barcode-reader-container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .barcode-reader-container video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .camera-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(26, 26, 46, 0.7);
      backdrop-filter: blur(5px);
      padding: 10px;
      display: flex;
      justify-content: space-around;
      gap: 10px;
    }
    .control-btn {
      background: transparent;
      border: 1px solid #0abdc6;
      color: #0abdc6;
      padding: 8px 12px;
      border-radius: 20px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 0.8rem;
      transition: all 0.3s;
    }
    .control-btn:hover {
      background-color: rgba(10, 189, 198, 0.1);
      box-shadow: 0 0 10px #0abdc6;
    }
    .close-btn {
      border-color: #F44336;
      color: #F44336;
    }
    .close-btn:hover {
      background-color: rgba(244, 67, 54, 0.1);
      box-shadow: 0 0 10px #F44336;
    }
  `]
})
export class CameraFeedComponent implements AfterViewInit, OnDestroy {
  @ViewChild('readerElement') readerElement!: ElementRef;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  @Input() instanceId: string = 'default'; // Unique ID for multiple instances if needed
  @Output() barcodeScanned = new EventEmitter<string>();
  @Output() imageCaptured = new EventEmitter<string>(); // Emits base64 image data
  @Output() cameraClosed = new EventEmitter<void>();

  private html5QrcodeScanner: Html5Qrcode | null = null;
  private selectedCameraId: string | null = null;
  private currentCameraIndex = 0;
  public cameras: MediaDeviceInfo[] = [];
  public isBarcodeScanning = true; // State for toggling barcode scanning

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
      this.cameraClosed.emit(); // Emit close if permission denied
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
        { fps: 10, qrbox: { width: 200, height: 150 } }, // Smaller QR box for chat window
        (decodedText, decodedResult) => {
          if (this.isBarcodeScanning) {
            this.barcodeScanned.emit(decodedText);
            this.audioService.playSuccessSound(); // Play sound on successful scan
            this.html5QrcodeScanner?.pause(); // Pause after scan to prevent multiple triggers
          }
        },
        (errorMessage) => {
          // console.warn('Barcode scan error:', errorMessage); // Suppress frequent errors
        }
      );
      this.notificationService.showInfo('Camera started.', 'Live Feed');
    } catch (error) {
      console.error('Error starting camera:', error);
      this.notificationService.showError('Failed to start camera feed.');
      this.cameraClosed.emit();
    }
  }

  private async stopCamera(): Promise<void> {
    if (this.html5QrcodeScanner && this.html5QrcodeScanner.isScanning) {
      try {
        await this.html5QrcodeScanner.stop();
        this.html5QrcodeScanner.clear();
        this.notificationService.showInfo('Camera stopped.', 'Live Feed');
      } catch (error) {
        console.error('Error stopping camera:', error);
        this.notificationService.showError('Failed to stop camera.');
      }
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
    const videoElement = (this.html5QrcodeScanner as any)?.getVideoElement(); // Added type assertion
    if (videoElement && this.canvasElement) {
      const canvas = this.canvasElement.nativeElement;
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/png');
        this.imageCaptured.emit(imageDataUrl);
        this.audioService.playSuccessSound(); // Play sound on capture
        this.notificationService.showInfo('Image captured!', 'OCR Ready');
      }
    } else {
      this.notificationService.showError('Camera not active for image capture.');
    }
  }

  public toggleBarcodeScanning(): void {
    this.isBarcodeScanning = !this.isBarcodeScanning;
    if (this.isBarcodeScanning) {
      this.html5QrcodeScanner?.resume(); // Ensure scanning is active if toggled on
      this.notificationService.showInfo('Barcode scanning enabled.', 'Scanner Mode');
    } else {
      this.html5QrcodeScanner?.pause(); // Pause barcode detection
      this.notificationService.showInfo('Barcode scanning disabled.', 'Scanner Mode');
    }
  }

  public closeCamera(): void {
    this.stopCamera();
    this.cameraClosed.emit();
  }

  public resumeBarcodeScanning(): void {
    if (this.isBarcodeScanning) {
      this.html5QrcodeScanner?.resume();
    }
  }
}