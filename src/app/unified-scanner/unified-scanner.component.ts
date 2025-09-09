import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Html5Qrcode } from 'html5-qrcode';
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
import { BarcodeLookupService } from '../services/barcode-lookup.service'; // Import the new service
import { take } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-unified-scanner',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './unified-scanner.component.html',
  styleUrls: ['./unified-scanner.component.css']
})
export class UnifiedScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reader') reader!: ElementRef;

  private html5QrcodeScanner!: Html5Qrcode;
  isScanningBarcode = false;
  isProcessingOcr = false;
  isVoiceListening = false;
  isStable = false; // New state for camera stability

  public cameras: MediaDeviceInfo[] = [];
  private selectedCameraId: string | null = null;
  private currentCameraIndex = 0;
  private voiceCommandSubscription!: Subscription;
  private preferencesSubscription!: Subscription;

  // --- Stability Detection Properties ---
  private stabilityCheckInterval: any;
  private lastFrame: ImageData | null = null;
  private stabilityThreshold = 500000; // Adjust this value based on testing
  private stableCounter = 0;
  private requiredStableFrames = 3; // Requires 1.5 seconds of stability (3 * 500ms)
  // --- End Stability Detection Properties ---

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
    private barcodeLookupService: BarcodeLookupService
  ) {}

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
        this.startBarcodeScanning();
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
      this.startBarcodeScanning();
      this.speechService.speak('Scanning barcode.');
    } else if (command.includes('go to history')) {
      this.router.navigate(['/history']);
      this.speechService.speak('Going to history.');
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
      this.startStabilityDetector(); // Start auto-capture detector
    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      this.notificationService.showError('Failed to start barcode scanner.');
      this.isScanningBarcode = false;
    }
  }

  async stopBarcodeScanning() {
    this.stopStabilityDetector();
    if (this.html5QrcodeScanner && this.html5QrcodeScanner.isScanning) {
      try {
        await this.html5QrcodeScanner.stop();
      } catch (error) {
        console.error('Error stopping barcode scanner:', error);
      }
    }
    this.isScanningBarcode = false;
  }

  async onBarcodeScanSuccess(decodedText: string): Promise<void> {
    await this.stopBarcodeScanning();
    this.notificationService.showInfo('Barcode detected! Fetching product data...', 'Scanning');

    let productData = await this.barcodeLookupService.getProductByBarcode(decodedText);

    if (!productData) {
      this.notificationService.showInfo('Primary source failed. Trying fallback...', 'Scanning');
      productData = await this.offService.getProductByBarcode(decodedText);
    }

    if (!productData) {
      this.notificationService.showError('Product not found in any database.', 'Not Found');
      this.startBarcodeScanning();
      return;
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
      this.startBarcodeScanning();
      return;
    }

    sessionStorage.setItem('scannedProduct', JSON.stringify(savedProduct));
    this.aiService.setLastDiscussedProduct(savedProduct);
    this.router.navigate(['/results']);
  }

  onBarcodeScanFailure(error: string) {}

  async captureLabelForOcr(): Promise<void> {
    if (this.isProcessingOcr) return;

    const video = this.reader.nativeElement.querySelector('video');
    if (!video) {
      this.notificationService.showError('Camera feed not found. Please try again.');
      return;
    }

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
    this.isProcessingOcr = true;
    await this.stopBarcodeScanning();

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const result = await Tesseract.recognize(dataUrl, 'eng');
      const text = result.data?.text || '';

      if (!text || text.trim().length === 0) {
        this.notificationService.showWarning('No text detected. Please adjust lighting and try again.');
        this.isProcessingOcr = false;
        this.startBarcodeScanning();
        return;
      }

      this.processExtractedText(text);
    } catch (err) {
      console.error('OCR error:', err);
      this.notificationService.showError('Failed to process the image. Please try again.');
      this.isProcessingOcr = false;
      this.startBarcodeScanning();
    }
  }

  private async processExtractedText(text: string): Promise<void> {
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
    if (!product) return;

    sessionStorage.setItem('viewingProduct', JSON.stringify(product));
    this.aiService.setLastDiscussedProduct(product);
    this.isProcessingOcr = false;
    this.router.navigate(['/ocr-results']);
  }

  async switchCamera() {
    if (this.cameras.length < 2) {
      this.notificationService.showInfo('No other camera found.');
      return;
    }
    await this.stopBarcodeScanning();
    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
    this.selectedCameraId = this.cameras[this.currentCameraIndex].deviceId;
    localStorage.setItem('fatBoySelectedCamera', this.selectedCameraId);
    this.notificationService.showSuccess(`Switched to ${this.cameras[this.currentCameraIndex].label}`);
    await this.startBarcodeScanning();
  }

  ngOnDestroy(): void {
    this.stopBarcodeScanning();
    this.speechService.stopListening();
    if (this.voiceCommandSubscription) {
      this.voiceCommandSubscription.unsubscribe();
    }
    if (this.preferencesSubscription) {
      this.preferencesSubscription.unsubscribe();
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

  // --- Stability Detection Methods ---
  private startStabilityDetector() {
    this.stopStabilityDetector(); // Ensure no multiple intervals are running
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
    if (this.isProcessingOcr || !this.isScanningBarcode) return;

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
      this.captureLabelForOcr();
    }
  }
  // --- End Stability Detection Methods ---
}