import { Injectable, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { ScannerCameraService } from './scanner-camera.service';
import { OcrProcessorService } from './ocr-processor.service';
import { BarcodeProcessorService } from './barcode-processor.service';
import { StabilityDetectorService } from './stability-detector.service';
import { HumanDetectorService } from './human-detector.service';
import { ProductDbService, Product } from './product-db.service';
import { NotificationService } from './notification.service';
import { SpeechService } from './speech.service';
import { PreferencesService } from './preferences.service';
import { AiIntegrationService } from './ai-integration.service';
import { AudioService } from './audio.service';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UnifiedScannerService {
  public isProcessingOcr = false;
  public screenFlash = false;
  public isScanningActive = false; // Overall state of the scanner
  public isStable = false; // From StabilityDetectorService

  public productScanned = new EventEmitter<Product>();
  public productProcessed = new EventEmitter<Product>();
  public scannerStateChanged = new EventEmitter<void>();

  private processingAbortController: AbortController | null = null;
  private barcodeScannedSubscription!: Subscription;
  private stableFrameSubscription!: Subscription;
  private cameraStartedSubscription!: Subscription;
  private cameraStoppedSubscription!: Subscription;
  private preferencesSubscription!: Subscription;

  private videoElementProvider: (() => HTMLVideoElement | null) | null = null;
  private canvasElementProvider: (() => HTMLCanvasElement) | null = null;

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
    private audioService: AudioService
  ) {
    this.subscribeToCameraEvents();
    this.subscribeToStabilityEvents();
    this.subscribeToPreferences();
  }

  public setCameraElements(videoElementProvider: () => HTMLVideoElement | null, canvasElementProvider: () => HTMLCanvasElement): void {
    this.videoElementProvider = videoElementProvider;
    this.canvasElementProvider = canvasElementProvider;
  }

  private subscribeToCameraEvents(): void {
    this.barcodeScannedSubscription = this.scannerCameraService.barcodeScanned.subscribe(decodedText => {
      this.handleBarcodeScan(decodedText);
    });
    this.cameraStartedSubscription = this.scannerCameraService.cameraStarted.subscribe(started => {
      this.isScanningActive = started;
      this.scannerStateChanged.emit();
    });
    this.cameraStoppedSubscription = this.scannerCameraService.cameraStopped.subscribe(() => {
      this.isScanningActive = false;
      this.scannerStateChanged.emit();
    });
  }

  private subscribeToStabilityEvents(): void {
    this.stableFrameSubscription = this.stabilityDetectorService.stableFrameCaptured.subscribe(() => {
      this.handleStableFrameCapture();
    });
    // Also subscribe to stability changes to update UI
    this.stabilityDetectorService.isStable$.subscribe(stable => {
      this.isStable = stable;
      this.scannerStateChanged.emit();
    });
  }

  private subscribeToPreferences(): void {
    this.preferencesSubscription = this.preferencesService.preferences$.subscribe(prefs => {
      if (prefs.enableVoiceCommands) {
        this.speechService.startListening();
      } else {
        this.speechService.stopListening();
      }
    });
  }

  public async startAllScanningFeatures(readerElementId: string): Promise<void> {
    const cameraStarted = await this.scannerCameraService.startScanning(readerElementId);
    if (cameraStarted && this.videoElementProvider && this.canvasElementProvider) {
      this.isScanningActive = true;
      this.stabilityDetectorService.start(this.videoElementProvider, this.canvasElementProvider);
      this.humanDetectorService.startDetection(this.videoElementProvider, this.canvasElementProvider);
    } else {
      this.isScanningActive = false;
    }
    this.scannerStateChanged.emit();
  }

  public stopAllScanningFeatures(): void {
    this.scannerCameraService.stopScanning();
    this.stabilityDetectorService.stop();
    this.humanDetectorService.stopDetection();
    this.speechService.stopListening();
    this.isScanningActive = false;
    this.scannerStateChanged.emit();
    this.abortProcessing();
  }

  public pauseAllDetectionServices(): void {
    this.scannerCameraService.pauseDetection();
    this.stabilityDetectorService.stop();
    this.humanDetectorService.stopDetection();
    this.speechService.stopListening();
    this.isScanningActive = false; // Indicate scanner is paused
    this.scannerStateChanged.emit();
    this.abortProcessing(); // Cancel any ongoing processing
  }

  public resumeAllDetectionServices(): void {
    this.scannerCameraService.resumeDetection();
    if (this.videoElementProvider && this.canvasElementProvider) {
      this.stabilityDetectorService.start(this.videoElementProvider, this.canvasElementProvider);
      this.humanDetectorService.startDetection(this.videoElementProvider, this.canvasElementProvider);
    }
    const prefs = this.preferencesService.getPreferences();
    if (prefs.enableVoiceCommands) {
      this.speechService.startListening();
    }
    this.isScanningActive = true;
    this.scannerStateChanged.emit();
  }

  private abortProcessing(): void {
    if (this.processingAbortController) {
      this.processingAbortController.abort();
      this.processingAbortController = null;
    }
    this.isProcessingOcr = false;
    this.screenFlash = false;
    this.scannerStateChanged.emit();
  }

  private async handleBarcodeScan(decodedText: string): Promise<void> {
    if (this.isProcessingOcr) return;

    this.pauseAllDetectionServices(); // Pause all detection during processing
    this.isProcessingOcr = true;
    this.notificationService.showInfo('Barcode detected! Fetching product data...', 'Scanning');
    this.processingAbortController = new AbortController();

    try {
      // Ensure processingAbortController is not null before accessing signal
      if (!this.processingAbortController) throw new Error('Processing aborted unexpectedly.');
      const productInfo = await this.barcodeProcessorService.processBarcode(decodedText, this.processingAbortController.signal);
      if (this.processingAbortController.signal.aborted) throw new Error('Operation aborted');

      if (!productInfo) {
        this.notificationService.showWarning('Product not found or could not be processed.', 'Not Found');
        this.audioService.playErrorSound();
        return;
      }

      const savedProduct = await this.productDb.addProduct(productInfo);
      if (!savedProduct) {
        return;
      }

      this.screenFlash = true;
      this.audioService.playSuccessSound();
      sessionStorage.setItem('scannedProduct', JSON.stringify(savedProduct));
      this.aiService.setLastDiscussedProduct(savedProduct);
      this.router.navigate(['/results']);
      this.productScanned.emit(savedProduct);

    } catch (error: any) {
      if (error.message === 'Operation aborted') {
        this.notificationService.showInfo('Scan processing cancelled.', 'Cancelled');
      } else {
        console.error('Barcode processing error:', error);
        this.notificationService.showError('Failed to process barcode.', 'Error');
        this.audioService.playErrorSound();
      }
    } finally {
      this.isProcessingOcr = false;
      this.screenFlash = false;
      this.processingAbortController = null;
      this.resumeAllDetectionServices(); // Resume all services after processing
    }
  }

  public async handleStableFrameCapture(): Promise<void> { // Made public
    if (this.isProcessingOcr) return;

    this.pauseAllDetectionServices(); // Pause all detection during processing
    this.isProcessingOcr = true;
    this.notificationService.showInfo('Capturing label for OCR...', 'Scanning');
    this.processingAbortController = new AbortController();

    try {
      if (!this.scannerCameraService.getLastFrameImageData()) {
        throw new Error('Could not capture image from camera.');
      }
      const imageData = this.scannerCameraService.getLastFrameImageData();
      if (!imageData || !this.canvasElementProvider) throw new Error('Could not capture image or canvas not available.');

      const canvas = this.canvasElementProvider();
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context.');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      // Ensure processingAbortController is not null before accessing signal
      if (!this.processingAbortController) throw new Error('Processing aborted unexpectedly.');
      const productInfo = await this.ocrProcessorService.processImageForOcr(dataUrl, this.processingAbortController.signal);
      if (this.processingAbortController.signal.aborted) throw new Error('Operation aborted');

      if (!productInfo) {
        this.notificationService.showWarning('No product data extracted from image.', 'OCR Failed');
        this.audioService.playErrorSound();
        return;
      }

      const savedProduct = await this.productDb.addProduct(productInfo);
      if (!savedProduct) {
        return;
      }

      this.screenFlash = true;
      this.audioService.playSuccessSound();
      sessionStorage.setItem('viewingProduct', JSON.stringify(savedProduct));
      this.aiService.setLastDiscussedProduct(savedProduct);
      this.router.navigate(['/ocr-results']);
      this.productProcessed.emit(savedProduct);

    } catch (err: any) {
      if (err.message === 'Operation aborted') {
        this.notificationService.showInfo('OCR processing cancelled.', 'Cancelled');
      } else {
        console.error('OCR capture error:', err);
        this.notificationService.showError('Failed to capture image for OCR. Please try again.', 'Error');
        this.audioService.playErrorSound();
      }
    } finally {
      this.isProcessingOcr = false;
      this.screenFlash = false;
      this.processingAbortController = null;
      this.resumeAllDetectionServices(); // Resume all services after processing
    }
  }

  public async processUploadedFile(file: File): Promise<void> {
    if (this.isProcessingOcr) return;

    this.pauseAllDetectionServices(); // Pause all detection during processing
    this.isProcessingOcr = true;
    this.notificationService.showInfo('Image uploaded, processing for OCR...', 'Upload');
    this.processingAbortController = new AbortController();

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        // Ensure processingAbortController is not null before accessing signal
        if (!this.processingAbortController) throw new Error('Processing aborted unexpectedly.');
        const productInfo = await this.ocrProcessorService.processImageForOcr(e.target.result, this.processingAbortController.signal);
        if (this.processingAbortController.signal.aborted) throw new Error('Operation aborted');

        if (!productInfo) {
          this.notificationService.showWarning('No product data extracted from uploaded image.', 'OCR Failed');
          this.audioService.playErrorSound();
          return;
        }

        const savedProduct = await this.productDb.addProduct(productInfo);
        if (!savedProduct) {
          return;
        }

        this.screenFlash = true;
        this.audioService.playSuccessSound();
        sessionStorage.setItem('viewingProduct', JSON.stringify(savedProduct));
        this.aiService.setLastDiscussedProduct(savedProduct);
        this.router.navigate(['/ocr-results']);
        this.productProcessed.emit(savedProduct);

      } catch (err: any) {
        if (err.message === 'Operation aborted') {
          this.notificationService.showInfo('Image upload processing cancelled.', 'Cancelled');
        } else {
          console.error('File upload OCR error:', err);
          this.notificationService.showError('Failed to process uploaded image. Please try again.', 'Error');
          this.audioService.playErrorSound();
        }
      } finally {
        this.isProcessingOcr = false;
        this.screenFlash = false;
        this.processingAbortController = null;
        this.resumeAllDetectionServices(); // Resume all services after processing
      }
    };
    reader.readAsDataURL(file);
  }

  public ngOnDestroy(): void {
    this.stopAllScanningFeatures();
    this.barcodeScannedSubscription?.unsubscribe();
    this.stableFrameSubscription?.unsubscribe();
    this.cameraStartedSubscription?.unsubscribe();
    this.cameraStoppedSubscription?.unsubscribe();
    this.preferencesSubscription?.unsubscribe();
  }
}