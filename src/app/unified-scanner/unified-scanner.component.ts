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
import { take } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-unified-scanner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './unified-scanner.component.html',
  styleUrls: ['./unified-scanner.component.css']
})
export class UnifiedScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reader') reader!: ElementRef; // For Html5Qrcode

  private html5QrcodeScanner!: Html5Qrcode;
  isScanningBarcode = false;
  isProcessingOcr = false;
  isVoiceListening = false;

  private cameras: MediaDeviceInfo[] = [];
  private selectedCameraId: string | null = null;
  private currentCameraIndex = 0;
  private voiceCommandSubscription!: Subscription;

  constructor(
    private router: Router,
    private offService: OpenFoodFactsService,
    private ocrEnhancer: OcrEnhancerService,
    private ingredientParser: IngredientParserService,
    private productDb: ProductDbService,
    private notificationService: NotificationService,
    private speechService: SpeechService,
    private authService: AuthService
  ) {}

  async ngAfterViewInit() {
    try {
      this.html5QrcodeScanner = new Html5Qrcode("reader");
      await this.setupCameras();
      if (this.cameras.length > 0) {
        this.startBarcodeScanning(); // This will start the single camera feed
      }
      this.checkVoiceCommandsPreference();
      this.voiceCommandSubscription = this.speechService.commandRecognized.subscribe(command => {
        this.handleVoiceCommand(command);
      });
    } catch (error) {
      console.error('Error initializing scanner:', error);
      this.notificationService.showError('Error initializing scanner.');
    }
  }

  private checkVoiceCommandsPreference(): void {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      const preferencesKey = user ? `fatBoyPreferences_${user.id}` : 'fatBoyPreferences_anonymous';
      const preferences = JSON.parse(localStorage.getItem(preferencesKey) || '{}');
      if (preferences.enableVoiceCommands) {
        this.speechService.startListening();
        this.isVoiceListening = true;
      }
    });
  }

  private handleVoiceCommand(command: string): void {
    if (command.includes('scan label') || command.includes('capture label')) {
      this.captureLabelForOcr();
      this.speechService.speak('Scanning label.');
    } else if (command.includes('scan barcode') || command.includes('start scanning')) {
      this.startBarcodeScanning(); // This will restart if already running
      this.speechService.speak('Scanning barcode.');
    } else if (command.includes('go to history')) {
      this.router.navigate(['/history']);
      this.speechService.speak('Going to history.');
    } else if (command.includes('go to preferences')) {
      this.router.navigate(['/preferences']);
      this.speechService.speak('Opening preferences.');
    } else if (command.includes('go to saved')) {
      this.router.navigate(['/saved']);
      this.speechService.speak('Opening saved products.');
    } else if (command.includes('go to shopping list')) {
      this.router.navigate(['/shopping-list']);
      this.speechService.speak('Opening shopping list.');
    } else if (command.includes('go to achievements')) {
      this.router.navigate(['/achievements']);
      this.speechService.speak('Opening achievements.');
    } else if (command.includes('go to community')) {
      this.router.navigate(['/community']);
      this.speechService.speak('Opening community page.');
    } else if (command.includes('go to food diary')) {
      this.router.navigate(['/food-diary']);
      this.speechService.speak('Opening food diary.');
    } else if (command.includes('switch camera')) {
      this.switchCamera();
      this.speechService.speak('Switching camera.');
    } else if (command.includes('add to shopping list')) {
      // This command will be handled on the results pages
      this.speechService.speak('You can add items to your shopping list from the results page.');
    } else {
      this.speechService.speak('Command not recognized. Please try again.');
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

  async startBarcodeScanning() {
    if (this.isScanningBarcode) return;
    try {
      this.isScanningBarcode = true;
      await this.html5QrcodeScanner.start(
        { deviceId: this.selectedCameraId ? { exact: this.selectedCameraId } : undefined, facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        this.onBarcodeScanSuccess.bind(this),
        this.onBarcodeScanFailure.bind(this)
      );
    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      this.notificationService.showError('Failed to start barcode scanner.');
      this.isScanningBarcode = false;
    }
  }

  stopBarcodeScanning() {
    if (!this.isScanningBarcode) return;
    this.html5QrcodeScanner.stop().then(() => {
      this.isScanningBarcode = false;
    }).catch((error) => {
      console.error('Error stopping barcode scanner:', error);
    });
  }

  async onBarcodeScanSuccess(decodedText: string): Promise<void> {
    this.stopBarcodeScanning();

    const productFromApi = await this.offService.getProductByBarcode(decodedText);
    const product = {
      barcode: productFromApi.barcode,
      name: productFromApi.name || "Unknown Product",
      brand: productFromApi.brand || "Unknown Brand",
      ingredients: Array.isArray(productFromApi.ingredients) && productFromApi.ingredients.length > 0
        ? productFromApi.ingredients
        : ["Ingredients not available"],
      calories: productFromApi.calories ?? undefined,
      image: productFromApi.image || "https://via.placeholder.com/150"
    };

    sessionStorage.setItem('scannedProduct', JSON.stringify(product));
    this.router.navigate(['/results']);
  }

  onBarcodeScanFailure(error: string) {
    // console.log('Barcode scan attempt failed:', error); // Too noisy for console
  }

  switchCamera() {
    if (this.cameras.length > 1) {
      this.stopBarcodeScanning(); // Stop current scanning before switching
      this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
      this.selectedCameraId = this.cameras[this.currentCameraIndex].deviceId;
      localStorage.setItem('fatBoySelectedCamera', this.selectedCameraId);
      this.startBarcodeScanning(); // Restart barcode detection with new camera
    } else {
      this.notificationService.showInfo('Only one camera found.');
    }
  }

  async captureLabelForOcr(): Promise<void> {
    if (this.isProcessingOcr) return;

    // Find the video element created by Html5Qrcode inside the #reader div
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
    this.stopBarcodeScanning(); // Stop continuous barcode scanning during OCR processing

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const result = await Tesseract.recognize(dataUrl, 'eng');
      const text = result.data?.text || '';

      if (!text || text.trim().length === 0) {
        this.notificationService.showWarning('No text detected. Please adjust lighting and try again.');
        this.isProcessingOcr = false;
        this.startBarcodeScanning(); // Restart barcode scanning
        return;
      }

      this.processExtractedText(text);
    } catch (err) {
      console.error('OCR error:', err);
      this.notificationService.showError('Failed to process the image. Please try again.');
      this.isProcessingOcr = false;
      this.startBarcodeScanning(); // Restart barcode scanning
    }
  }

  private processExtractedText(text: string): void {
    // The camera is already stopped by stopBarcodeScanning()
    const enhancedIngredients = this.ocrEnhancer.enhanceIngredientDetection(text);
    const productName = this.ocrEnhancer.detectProductName(text);
    const brand = this.ocrEnhancer.detectBrand(text);

    const categories = this.ingredientParser.categorizeProduct(enhancedIngredients);
    const evaluation = this.ingredientParser.evaluateProduct(enhancedIngredients, undefined, JSON.parse(localStorage.getItem('fatBoyPreferences_anonymous') || '{}'));

    const productInfo: Omit<Product, 'id' | 'scanDate'> = {
      name: productName,
      brand: brand,
      ingredients: enhancedIngredients,
      categories,
      verdict: evaluation.verdict,
      flaggedIngredients: evaluation.flaggedIngredients.map(f => f.ingredient),
      ocrText: text
    };

    const product = this.productDb.addProduct(productInfo);
    sessionStorage.setItem('viewingProduct', JSON.stringify(product));
    this.isProcessingOcr = false;
    this.router.navigate(['/ocr-results']);
  }

  ngOnDestroy(): void {
    this.stopBarcodeScanning();
    this.speechService.stopListening();
    if (this.voiceCommandSubscription) {
      this.voiceCommandSubscription.unsubscribe();
    }
  }
}