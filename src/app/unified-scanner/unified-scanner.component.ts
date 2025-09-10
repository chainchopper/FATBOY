import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Html5Qrcode, Html5QrcodeResult } from 'html5-qrcode'; // Import Html5QrcodeResult
import Tesseract from 'tesseract.js';
import { OpenFoodFactsService } from '../services/open-food-facts.service';
import { OcrEnhancerService } from '../services/ocr-enhancer.service';
import { IngredientParserService } from '../services/ingredient-parser.service';
import { ProductDbService, Product } from '../services/product-db.service';
import { NotificationService } from '../services/notification.service';
import { SpeechService } from '../services/speech.service';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';
import { PreferencesService } from '../services/preferences.service';
import { AiIntegrationService } from '../services/ai-integration.service';
import { BarcodeLookupService } from '../services/barcode-lookup.service';
import { take } from 'rxjs/operators';
import { Subscription, Observable } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { UiService } from '../services/ui.service';
import { LogoComponent } from '../logo.component';
import { UserNotificationService } from '../services/user-notification.service';
import { NotificationsComponent } from '../notifications/notifications.component';
import { AudioService } from '../services/audio.service'; // Import AudioService

@Component({
  selector: 'app-unified-scanner',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, LogoComponent, NotificationsComponent],
  templateUrl: './unified-scanner.component.html',
  styleUrls: ['./unified-scanner.component.css']
})
export class UnifiedScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reader') reader!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private html5QrcodeScanner!: Html5Qrcode;
  isScanningBarcode = false;
  isProcessingOcr = false;
  isVoiceListening = false;
  isStable = false;
  showExpandedOptions = false;
  screenFlash = false; // New property for screen flash

  public cameras: MediaDeviceInfo[] = [];
  private selectedCameraId: string | null = null;
  private currentCameraIndex = 0;
  private voiceCommandSubscription!: Subscription;
  private preferencesSubscription!: Subscription;

  public showNotifications = false;
  public unreadNotifications$!: Observable<number>;

  private stabilityCheckInterval: any;
  private lastFrame: ImageData | null = null;
  private stabilityThreshold = 500000;
  private stableCounter = 0;
  private requiredStableFrames = 3;

  // Track ongoing OCR/barcode lookup promises to cancel them
  private currentProcessingPromise: Promise<any> | null = null;
  private processingAbortController: AbortController | null = null;

  constructor(
    private router: Router,
    private offService: OpenFoodFactsService,
    private ocrEnhancer: OcrEnhancerService,
    private ingredientParser: IngredientParserService,
    private productDb: ProductDbService,
    private notificationService: NotificationService,
    private speechService: SpeechService,
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private preferencesService: PreferencesService,
    private aiService: AiIntegrationService,
    private barcodeLookupService: BarcodeLookupService,
    public uiService: UiService,
    private userNotificationService: UserNotificationService,
    private audioService: AudioService // Inject AudioService
  ) {
    this.unreadNotifications$ = this.userNotificationService.unreadCount$;
  }

  async ngAfterViewInit() {
    const hasCameraPermission = await this.permissionsService.checkAndRequestCameraPermission();
    if (!hasCameraPermission) {
      this.notificationService.showError('Camera access is required to use the scanner.');
      return;
    }

    try {
      this.html5QrcodeScanner = new Html5Qrcode("reader");
      await this.setupCameras();
      if (this.cameras.length > 0) {
        this.startBarcodeScanning(); // Start scanning immediately
      }
      this.preferencesSubscription = this.preferencesService.preferences$.subscribe(prefs => {
        if (prefs.enableVoiceCommands) {
          this.speechService.startListening();
          this.isVoiceListening = true;
        } else {
          this.speechService.stopListening();
          this.isVoiceListening = false;
        }
      });
      this.voiceCommandSubscription = this.speechService.commandRecognized.subscribe(command => {
        this.handleVoiceCommand(command);
      });
    } catch (error) {
      console.error('Error initializing scanner:', error);
      this.notificationService.showError('Error initializing scanner.');
    }
  }

  toggleVoiceListening() {
    const currentPrefs = this.preferencesService.getPreferences();
    this.preferencesService.savePreferences({ ...currentPrefs, enableVoiceCommands: !currentPrefs.enableVoiceCommands });
  }

  private handleVoiceCommand(command: string): void {
    if (command.includes('scan label') || command.includes('capture label')) {
      this.captureLabelForOcr();
      this.speechService.speak('Scanning label.');
    } else if (command.includes('scan barcode') || command.includes('start scanning')) {
      // Barcode scanning is continuous, so this command might just confirm it's active
      this.notificationService.showInfo('Barcode scanning is already active.', 'Scanning');
      this.speechService.speak('Barcode scanning is already active.');
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

  async startBarcodeScanning() {
    if (this.isScanningBarcode) return;
    try {
      this.isScanningBarcode = true;
      
      const cameraConfig = this.selectedCameraId
        ? { deviceId: { exact: this.selectedCameraId } }
        : { facingMode: "environment" };

      await this.html5QrcodeScanner.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        this.onBarcodeScanSuccess.bind(this),
        this.onBarcodeScanFailure.bind(this)
      );
      this.startStabilityDetector(); // Start auto-capture detector for OCR
    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      this.notificationService.showError('Failed to start camera for scanning.');
      this.isScanningBarcode = false;
    }
  }

  // This method now only pauses the detection, not the camera stream
  async pauseScanningDetection(): Promise<void> {
    if (this.html5QrcodeScanner && this.html5QrcodeScanner.isScanning) {
      this.html5QrcodeScanner.pause();
    }
    this.stopStabilityDetector(); // Stop OCR auto-capture
    this.isScanningBarcode = false; // Reflect that active barcode detection is paused
  }

  // This method now only resumes the detection, not restarts the camera stream
  async resumeScanningDetection(): Promise<void> {
    if (this.html5QrcodeScanner && !this.html5QrcodeScanner.isScanning) {
      this.html5QrcodeScanner.resume();
    }
    this.startStabilityDetector(); // Resume OCR auto-capture
    this.isScanningBarcode = true; // Reflect that active barcode detection is resumed
  }

  async onBarcodeScanSuccess(decodedText: string, decodedResult: Html5QrcodeResult): Promise<void> {
    if (this.isProcessingOcr) return; // Don't process if OCR is already running

    this.pauseScanningDetection(); // Pause detection to avoid multiple triggers
    this.isProcessingOcr = true; // Use this flag to indicate a processing task is active

    this.screenFlash = true; // Flash the screen
    this.audioService.playSuccessSound(); // Play success sound
    this.notificationService.showInfo('Barcode detected! Fetching product data...', 'Scanning');

    this.processingAbortController = new AbortController();
    const signal = this.processingAbortController.signal;

    try {
      let productData = await this.barcodeLookupService.getProductByBarcode(decodedText);

      if (signal.aborted) throw new Error('Operation aborted');

      if (!productData) {
        this.notificationService.showInfo('Primary source failed. Trying fallback...', 'Scanning');
        productData = await this.offService.getProductByBarcode(decodedText);
      }

      if (signal.aborted) throw new Error('Operation aborted');

      if (!productData) {
        this.notificationService.showError('Product not found in any database.', 'Not Found');
        this.audioService.playErrorSound();
        return; // Stop processing here, no flash/sound for failed recognition
      }

      const ingredients = productData.ingredients && productData.ingredients.length > 0
        ? productData.ingredients
        : ["Ingredients not available"];

      const preferences = this.preferencesService.getPreferences();
      const categories = this.ingredientParser.categorizeProduct(ingredients);
      const evaluation = this.ingredientParser.evaluateProduct(ingredients, productData.calories, preferences);

      const productInfo: Omit<Product, 'id' | 'scanDate'> = {
        barcode: decodedText,
        name: productData.name || "Unknown Product",
        brand: productData.brand || "Unknown Brand",
        ingredients: ingredients,
        calories: productData.calories ?? undefined,
        image: productData.image || "https://via.placeholder.com/150",
        categories,
        verdict: evaluation.verdict,
        flaggedIngredients: evaluation.flaggedIngredients.map(f => f.ingredient)
      };

      const savedProduct = await this.productDb.addProduct(productInfo);
      if (!savedProduct) {
        // productDb.addProduct now handles 'not logged in' and shows notification
        // No need for flash/sound here as it's a user-related failure, not recognition failure
        return; // Stop processing
      }

      sessionStorage.setItem('scannedProduct', JSON.stringify(savedProduct));
      this.aiService.setLastDiscussedProduct(savedProduct);
      this.router.navigate(['/results']);

    } catch (error: any) {
      if (error.message === 'Operation aborted') {
        this.notificationService.showInfo('Scan processing cancelled.', 'Cancelled');
      } else {
        console.error('Barcode processing error:', error);
        this.notificationService.showError('Failed to process barcode.', 'Error');
        this.audioService.playErrorSound(); // Play error sound for technical processing failure
      }
    } finally {
      this.isProcessingOcr = false;
      this.screenFlash = false; // Clear flash regardless of success/failure
      this.processingAbortController = null;
      this.resumeScanningDetection(); // Resume detection after processing
    }
  }

  onBarcodeScanFailure(error: string) {
    // This is called continuously, so avoid excessive logging or notifications
    // console.warn('Barcode scan failure:', error);
  }

  async captureLabelForOcr(): Promise<void> {
    if (this.isProcessingOcr) return;

    this.pauseScanningDetection(); // Pause detection to avoid conflicts
    this.isProcessingOcr = true;

    this.screenFlash = true; // Flash the screen
    this.audioService.playSuccessSound(); // Play success sound
    this.notificationService.showInfo('Capturing label for OCR...', 'Scanning');

    this.processingAbortController = new AbortController();
    const signal = this.processingAbortController.signal;

    try {
      const video = this.reader.nativeElement.querySelector('video');
      if (!video) {
        throw new Error('Camera feed not found.');
      }

      const canvas = this.canvasElement.nativeElement;
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('Camera not ready yet.');
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2d context.');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');

      if (signal.aborted) throw new Error('Operation aborted');

      await this.processImageForOcr(dataUrl, signal);

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
      this.resumeScanningDetection(); // Resume detection after processing
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
        if (this.isProcessingOcr) return; // Prevent multiple uploads

        this.pauseScanningDetection(); // Pause detection
        this.isProcessingOcr = true;

        this.screenFlash = true; // Flash the screen
        this.audioService.playSuccessSound(); // Play success sound
        this.notificationService.showInfo('Image uploaded, processing for OCR...', 'Upload');

        this.processingAbortController = new AbortController();
        const signal = this.processingAbortController.signal;

        try {
          if (signal.aborted) throw new Error('Operation aborted');
          await this.processImageForOcr(e.target.result, signal);
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
          this.resumeScanningDetection(); // Resume detection
        }
      };
      reader.readAsDataURL(file);
    }
  }

  private async processImageForOcr(imageDataUrl: string, signal: AbortSignal): Promise<void> {
    try {
      const result = await Tesseract.recognize(imageDataUrl, 'eng', { signal } as any);
      const text = result.data?.text || '';

      if (signal.aborted) throw new Error('Operation aborted');

      if (!text || text.trim().length === 0) {
        this.notificationService.showWarning('No text detected. Please try a different image.', 'OCR Failed');
        this.audioService.playErrorSound();
        return; // Stop processing here, no flash/sound for failed recognition
      }

      const enhancedIngredients = this.ocrEnhancer.enhanceIngredientDetection(text);
      const productName = this.ocrEnhancer.detectProductName(text);
      const brand = this.ocrEnhancer.detectBrand(text);

      const preferences = this.preferencesService.getPreferences();
      const categories = this.ingredientParser.categorizeProduct(enhancedIngredients);
      const evaluation = this.ingredientParser.evaluateProduct(enhancedIngredients, undefined, preferences);

      const productInfo: Omit<Product, 'id' | 'scanDate'> = {
        name: productName,
        brand: brand,
        ingredients: enhancedIngredients,
        categories,
        verdict: evaluation.verdict,
        flaggedIngredients: evaluation.flaggedIngredients.map(f => f.ingredient),
        ocrText: text
      };

      const product = await this.productDb.addProduct(productInfo);
      if (!product) {
        // productDb.addProduct now handles 'not logged in' and shows notification
        // No need for flash/sound here as it's a user-related failure, not recognition failure
        return; // Stop processing
      }

      sessionStorage.setItem('viewingProduct', JSON.stringify(product));
      this.aiService.setLastDiscussedProduct(product);
      this.router.navigate(['/ocr-results']);

    } catch (err: any) {
      if (err.message === 'Operation aborted') {
        throw err; // Re-throw to be caught by the calling function's abort handler
      } else {
        console.error('OCR processing error:', err);
        this.notificationService.showError('Failed to process the image. Please try again.', 'Error');
        this.audioService.playErrorSound(); // Play error sound for technical processing failure
      }
    } finally {
      this.isProcessingOcr = false;
      this.screenFlash = false; // Clear flash regardless of success/failure
      this.processingAbortController = null;
      this.resumeScanningDetection(); // Resume detection after processing
    }
  }

  async switchCamera() {
    if (this.cameras.length < 2) {
      this.notificationService.showInfo('No other camera found.');
      return;
    }
    await this.pauseScanningDetection(); // Pause current detection
    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
    this.selectedCameraId = this.cameras[this.currentCameraIndex].deviceId;
    localStorage.setItem('fatBoySelectedCamera', this.selectedCameraId);
    this.notificationService.showSuccess(`Switched to ${this.cameras[this.currentCameraIndex].label}`);
    await this.resumeScanningDetection(); // Resume detection with new camera
  }

  ngOnDestroy(): void {
    // Ensure camera is stopped and subscriptions are unsubscribed
    if (this.html5QrcodeScanner && this.html5QrcodeScanner.isScanning) {
      this.html5QrcodeScanner.stop().catch(err => console.error('Error stopping scanner on destroy:', err));
    }
    this.stopStabilityDetector();
    this.speechService.stopListening();
    if (this.voiceCommandSubscription) {
      this.voiceCommandSubscription.unsubscribe();
    }
    if (this.preferencesSubscription) {
      this.preferencesSubscription.unsubscribe();
    }
    // Abort any pending processing
    if (this.processingAbortController) {
      this.processingAbortController.abort();
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

  private startStabilityDetector() {
    this.stopStabilityDetector();
    this.stableCounter = 0; // Reset counter
    this.isStable = false; // Reset stability state
    this.stabilityCheckInterval = setInterval(() => {
      this.checkForStability();
    }, 500);
  }

  private stopStabilityDetector() {
    if (this.stabilityCheckInterval) {
      clearInterval(this.stabilityCheckInterval);
      this.stabilityCheckInterval = null;
    }
    this.lastFrame = null;
    this.stableCounter = 0;
    this.isStable = false;
  }

  private checkForStability() {
    if (this.isProcessingOcr || !this.html5QrcodeScanner || !this.html5QrcodeScanner.isScanning) return;

    const video = this.reader.nativeElement.querySelector('video');
    if (!video || video.readyState < video.HAVE_METADATA) return;

    const canvas = document.createElement('canvas');
    const scale = 0.25;
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (this.lastFrame) {
      let diff = 0;
      for (let i = 0; i < currentFrame.data.length; i += 4) {
        diff += Math.abs(currentFrame.data[i] - this.lastFrame.data[i]);
      }

      if (diff < this.stabilityThreshold) {
        this.stableCounter++;
      } else {
        this.stableCounter = 0;
      }
    }

    this.lastFrame = currentFrame;
    this.isStable = this.stableCounter > 0;

    if (this.stableCounter >= this.requiredStableFrames) {
      this.notificationService.showInfo('Camera is stable, analyzing label...', 'Auto-Scan');
      this.captureLabelForOcr(); // Trigger OCR capture automatically
    }
  }

  toggleExpandedOptions(): void {
    if (this.showExpandedOptions) { // If currently expanded, collapsing
      this.resumeScanningDetection();
      // If any processing was ongoing, it would have been aborted when expanding
    } else { // If currently collapsed, expanding
      this.pauseScanningDetection();
      // Abort any ongoing processing when expanding the menu
      if (this.processingAbortController) {
        this.processingAbortController.abort();
        this.isProcessingOcr = false; // Reset processing flag
        this.screenFlash = false; // Clear flash
        this.processingAbortController = null;
      }
    }
    this.showExpandedOptions = !this.showExpandedOptions;
  }
}