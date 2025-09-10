import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, Observable } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

// Import new services
import { ScannerCameraService } from '../services/scanner-camera.service';
import { OcrProcessorService } from '../services/ocr-processor.service';
import { BarcodeProcessorService } from '../services/barcode-processor.service';
import { StabilityDetectorService } from '../services/stability-detector.service';
import { HumanDetectorService } from '../services/human-detector.service';

// Import existing services
import { ProductDbService, Product } from '../services/product-db.service';
import { NotificationService } from '../services/notification.service';
import { SpeechService } from '../services/speech.service';
import { PreferencesService } from '../services/preferences.service';
import { AiIntegrationService } from '../services/ai-integration.service';
import { UiService } from '../services/ui.service';
import { UserNotificationService } from '../services/user-notification.service';
import { AudioService } from '../services/audio.service';
import { NotificationsComponent } from '../notifications/notifications.component';

@Component({
  selector: 'app-unified-scanner',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, NotificationsComponent],
  templateUrl: './unified-scanner.component.html',
  styleUrls: ['./unified-scanner.component.css']
})
export class UnifiedScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reader') reader!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isProcessingOcr = false;
  isVoiceListening = false;
  showExpandedOptions = false;
  screenFlash = false;
  showNotifications = false; // Declare showNotifications property
  isScanningActive = false; // New property to control overall scanning state

  public unreadNotifications$!: Observable<number>;
  private voiceCommandSubscription!: Subscription;
  private preferencesSubscription!: Subscription;
  private barcodeScannedSubscription!: Subscription;
  private stableFrameSubscription!: Subscription;
  private cameraStartedSubscription!: Subscription;

  // Track ongoing processing to allow cancellation
  private processingAbortController: AbortController | null = null;

  constructor(
    private router: Router,
    private scannerCameraService: ScannerCameraService,
    private ocrProcessorService: OcrProcessorService,
    private barcodeProcessorService: BarcodeProcessorService,
    private stabilityDetectorService: StabilityDetectorService,
    private humanDetectorService: HumanDetectorService,
    private productDb: ProductDbService,
    private notificationService: NotificationService,
    private speechService: SpeechService,
    private preferencesService: PreferencesService,
    private aiService: AiIntegrationService,
    public uiService: UiService,
    private userNotificationService: UserNotificationService,
    private audioService: AudioService
  ) {
    this.unreadNotifications$ = this.userNotificationService.unreadCount$;
  }

  async ngAfterViewInit() {
    await this.startAllScanningFeatures();

    this.preferencesSubscription = this.preferencesService.preferences$.subscribe(prefs => {
      this.isVoiceListening = prefs.enableVoiceCommands;
      if (prefs.enableVoiceCommands) {
        this.speechService.startListening();
      } else {
        this.speechService.stopListening();
      }
    });

    this.voiceCommandSubscription = this.speechService.commandRecognized.subscribe(command => {
      this.handleVoiceCommand(command);
    });

    this.barcodeScannedSubscription = this.scannerCameraService.barcodeScanned.subscribe(decodedText => {
      this.handleBarcodeScan(decodedText);
    });

    this.stableFrameSubscription = this.stabilityDetectorService.stableFrameCaptured.subscribe(() => {
      this.handleStableFrameCapture();
    });
  }

  ngOnDestroy(): void {
    this.stopAllScanningFeatures();
    this.voiceCommandSubscription?.unsubscribe();
    this.preferencesSubscription?.unsubscribe();
    this.barcodeScannedSubscription?.unsubscribe();
    this.stableFrameSubscription?.unsubscribe();
    this.cameraStartedSubscription?.unsubscribe();
    this.abortProcessing();
  }

  private async startAllScanningFeatures(): Promise<void> {
    const cameraStarted = await this.scannerCameraService.startScanning('reader');
    if (cameraStarted) {
      this.isScanningActive = true;
      this.stabilityDetectorService.start(
        () => this.scannerCameraService.getVideoElement(),
        () => this.canvasElement.nativeElement
      );
      this.humanDetectorService.startDetection(
        () => this.scannerCameraService.getVideoElement(),
        () => this.canvasElement.nativeElement
      );
    } else {
      this.isScanningActive = false;
    }
  }

  private stopAllScanningFeatures(): void {
    this.scannerCameraService.stopScanning();
    this.stabilityDetectorService.stop();
    this.humanDetectorService.stopDetection();
    this.speechService.stopListening();
    this.isScanningActive = false;
  }

  get isScanningBarcode(): boolean {
    return this.scannerCameraService.isScanning();
  }

  get isStable(): boolean {
    return this.stabilityDetectorService.isStable;
  }

  toggleVoiceListening(): void {
    const currentPrefs = this.preferencesService.getPreferences();
    this.preferencesService.savePreferences({ ...currentPrefs, enableVoiceCommands: !currentPrefs.enableVoiceCommands });
  }

  private handleVoiceCommand(command: string): void {
    if (command.includes('scan label') || command.includes('capture label')) {
      this.handleStableFrameCapture(); // Trigger OCR capture
      this.speechService.speak('Scanning label.');
    } else if (command.includes('go to history')) {
      this.router.navigate(['/history']);
      this.speechService.speak('Going to history.');
    } else if (command.includes('upload image')) {
      this.triggerFileUpload();
      this.speechService.speak('Opening file upload.');
    } else {
      this.speechService.speak('Command not recognized. Please try again.');
    }
  }

  private abortProcessing(): void {
    if (this.processingAbortController) {
      this.processingAbortController.abort();
      this.processingAbortController = null;
    }
    this.isProcessingOcr = false;
    this.screenFlash = false;
  }

  toggleExpandedOptions(): void {
    if (this.showExpandedOptions) { // Collapsing options
      this.startAllScanningFeatures(); // Resume all scanning features
    } else { // Expanding options
      this.scannerCameraService.pauseDetection();
      this.stabilityDetectorService.stop();
      this.humanDetectorService.stopDetection();
      this.abortProcessing(); // Cancel any ongoing processing
      this.isScanningActive = false; // Indicate scanner is paused for options
    }
    this.showExpandedOptions = !this.showExpandedOptions;
  }

  private async handleBarcodeScan(decodedText: string): Promise<void> {
    if (this.isProcessingOcr || this.showExpandedOptions) return;

    this.scannerCameraService.pauseDetection(); // Pause detection to avoid multiple triggers
    this.isProcessingOcr = true;
    this.notificationService.showInfo('Barcode detected! Fetching product data...', 'Scanning');
    this.processingAbortController = new AbortController();

    try {
      const productInfo = await this.barcodeProcessorService.processBarcode(decodedText, this.processingAbortController.signal);
      if (this.processingAbortController.signal.aborted) throw new Error('Operation aborted');

      if (!productInfo) {
        this.notificationService.showWarning('Product not found or could not be processed.', 'Not Found');
        this.audioService.playErrorSound();
        this.scannerCameraService.resumeDetection(); // Resume detection after failure
        this.stabilityDetectorService.start( // Restart stability detector
          () => this.scannerCameraService.getVideoElement(),
          () => this.canvasElement.nativeElement
        );
        this.humanDetectorService.startDetection( // Restart human detector
          () => this.scannerCameraService.getVideoElement(),
          () => this.canvasElement.nativeElement
        );
        return; // Do not proceed with flash/sound/navigation
      }

      const savedProduct = await this.productDb.addProduct(productInfo);
      if (!savedProduct) {
        // productDb.addProduct now handles 'not logged in' and shows notification
        this.scannerCameraService.resumeDetection(); // Resume detection after failure
        this.stabilityDetectorService.start( // Restart stability detector
          () => this.scannerCameraService.getVideoElement(),
          () => this.canvasElement.nativeElement
        );
        this.humanDetectorService.startDetection( // Restart human detector
          () => this.scannerCameraService.getVideoElement(),
          () => this.canvasElement.nativeElement
        );
        return; // Do not proceed with flash/sound/navigation
      }

      this.screenFlash = true;
      this.audioService.playSuccessSound();
      sessionStorage.setItem('scannedProduct', JSON.stringify(savedProduct));
      this.aiService.setLastDiscussedProduct(savedProduct);
      this.router.navigate(['/results']);

    } catch (error: any) {
      if (error.message === 'Operation aborted') {
        this.notificationService.showInfo('Scan processing cancelled.', 'Cancelled');
      } else {
        console.error('Barcode processing error:', error);
        this.notificationService.showError('Failed to process barcode.', 'Error');
        this.audioService.playErrorSound();
      }
      this.scannerCameraService.resumeDetection(); // Ensure resume on error
      this.stabilityDetectorService.start( // Restart stability detector on error
        () => this.scannerCameraService.getVideoElement(),
        () => this.canvasElement.nativeElement
      );
      this.humanDetectorService.startDetection( // Restart human detector on error
        () => this.scannerCameraService.getVideoElement(),
        () => this.canvasElement.nativeElement
      );
    } finally {
      this.isProcessingOcr = false;
      this.screenFlash = false; // Ensure flash is reset
      this.processingAbortController = null;
      // Resume detection is handled in the success/failure paths
    }
  }

  private async handleStableFrameCapture(): Promise<void> {
    if (this.isProcessingOcr || this.showExpandedOptions) return;

    this.scannerCameraService.pauseDetection(); // Pause detection to avoid conflicts
    this.isProcessingOcr = true;
    this.notificationService.showInfo('Capturing label for OCR...', 'Scanning');
    this.processingAbortController = new AbortController();

    try {
      const imageData = this.scannerCameraService.getLastFrameImageData();
      if (!imageData) throw new Error('Could not capture image from camera.');

      const canvas = this.canvasElement.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context.');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      const productInfo = await this.ocrProcessorService.processImageForOcr(dataUrl, this.processingAbortController.signal);
      if (this.processingAbortController.signal.aborted) throw new Error('Operation aborted');

      if (!productInfo) {
        this.notificationService.showWarning('No product data extracted from image.', 'OCR Failed');
        this.audioService.playErrorSound();
        this.scannerCameraService.resumeDetection(); // Resume detection after failure
        this.stabilityDetectorService.start( // Restart stability detector
          () => this.scannerCameraService.getVideoElement(),
          () => this.canvasElement.nativeElement
        );
        this.humanDetectorService.startDetection( // Restart human detector
          () => this.scannerCameraService.getVideoElement(),
          () => this.canvasElement.nativeElement
        );
        return; // Do not proceed with flash/sound/navigation
      }

      const savedProduct = await this.productDb.addProduct(productInfo);
      if (!savedProduct) {
        this.scannerCameraService.resumeDetection(); // Resume detection after failure
        this.stabilityDetectorService.start( // Restart stability detector
          () => this.scannerCameraService.getVideoElement(),
          () => this.canvasElement.nativeElement
        );
        this.humanDetectorService.startDetection( // Restart human detector
          () => this.scannerCameraService.getVideoElement(),
          () => this.canvasElement.nativeElement
        );
        return; // Do not proceed with flash/sound/navigation
      }

      this.screenFlash = true;
      this.audioService.playSuccessSound();
      sessionStorage.setItem('viewingProduct', JSON.stringify(savedProduct));
      this.aiService.setLastDiscussedProduct(savedProduct);
      this.router.navigate(['/ocr-results']);

    } catch (err: any) {
      if (err.message === 'Operation aborted') {
        this.notificationService.showInfo('OCR processing cancelled.', 'Cancelled');
      } else {
        console.error('OCR capture error:', err);
        this.notificationService.showError('Failed to capture image for OCR. Please try again.', 'Error');
        this.audioService.playErrorSound();
      }
      this.scannerCameraService.resumeDetection(); // Ensure resume on error
      this.stabilityDetectorService.start( // Restart stability detector on error
        () => this.scannerCameraService.getVideoElement(),
        () => this.canvasElement.nativeElement
      );
      this.humanDetectorService.startDetection( // Restart human detector on error
        () => this.scannerCameraService.getVideoElement(),
        () => this.canvasElement.nativeElement
      );
    } finally {
      this.isProcessingOcr = false;
      this.screenFlash = false; // Ensure flash is reset
      this.processingAbortController = null;
      // Resume detection is handled in the success/failure paths
    }
  }

  triggerFileUpload(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        if (this.isProcessingOcr || this.showExpandedOptions) return;

        this.scannerCameraService.pauseDetection();
        this.isProcessingOcr = true;
        this.notificationService.showInfo('Image uploaded, processing for OCR...', 'Upload');
        this.processingAbortController = new AbortController();

        try {
          const productInfo = await this.ocrProcessorService.processImageForOcr(e.target.result, this.processingAbortController.signal);
          if (this.processingAbortController.signal.aborted) throw new Error('Operation aborted');

          if (!productInfo) {
            this.notificationService.showWarning('No product data extracted from uploaded image.', 'OCR Failed');
            this.audioService.playErrorSound();
            this.scannerCameraService.resumeDetection(); // Resume detection after failure
            this.stabilityDetectorService.start( // Restart stability detector
              () => this.scannerCameraService.getVideoElement(),
              () => this.canvasElement.nativeElement
            );
            this.humanDetectorService.startDetection( // Restart human detector
              () => this.scannerCameraService.getVideoElement(),
              () => this.canvasElement.nativeElement
            );
            return; // Do not proceed with flash/sound/navigation
          }

          const savedProduct = await this.productDb.addProduct(productInfo);
          if (!savedProduct) {
            this.scannerCameraService.resumeDetection(); // Resume detection after failure
            this.stabilityDetectorService.start( // Restart stability detector
              () => this.scannerCameraService.getVideoElement(),
              () => this.canvasElement.nativeElement
            );
            this.humanDetectorService.startDetection( // Restart human detector
              () => this.scannerCameraService.getVideoElement(),
              () => this.canvasElement.nativeElement
            );
            return; // Do not proceed with flash/sound/navigation
          }

          this.screenFlash = true;
          this.audioService.playSuccessSound();
          sessionStorage.setItem('viewingProduct', JSON.stringify(savedProduct));
          this.aiService.setLastDiscussedProduct(savedProduct);
          this.router.navigate(['/ocr-results']);

        } catch (err: any) {
          if (err.message === 'Operation aborted') {
            this.notificationService.showInfo('Image upload processing cancelled.', 'Cancelled');
          } else {
            console.error('File upload OCR error:', err);
            this.notificationService.showError('Failed to process uploaded image. Please try again.', 'Error');
            this.audioService.playErrorSound();
          }
          this.scannerCameraService.resumeDetection(); // Ensure resume on error
          this.stabilityDetectorService.start( // Restart stability detector on error
            () => this.scannerCameraService.getVideoElement(),
            () => this.canvasElement.nativeElement
          );
          this.humanDetectorService.startDetection( // Restart human detector on error
            () => this.scannerCameraService.getVideoElement(),
            () => this.canvasElement.nativeElement
          );
        } finally {
          this.isProcessingOcr = false;
          this.screenFlash = false;
          this.processingAbortController = null;
          // Resume detection is handled in the success/failure paths
        }
      };
      reader.readAsDataURL(file);
    }
  }
}