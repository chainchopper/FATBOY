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
  // Removed @ViewChild('videoElement') as Html5Qrcode manages its own video
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reader') reader!: ElementRef; // For Html5Qrcode

  private html5QrcodeScanner!: Html5Qrcode;
  isScanningBarcode = false; // Html5Qrcode is always trying to scan barcodes
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
        // Start Html5Qrcode, which will manage the camera stream for both barcode and OCR capture
        this.startHtml5QrcodeCamera();
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

  private async startHtml5QrcodeCamera() {
    // Stop any existing Html5Qrcode scanner instance first
    if (this.html5QrcodeScanner.isScanning) {
      await this.html5QrcodeScanner.stop().catch(err => console.warn('Error stopping existing Html5Qrcode scanner:', err));
    }

    try {
      this.isScanningBarcode = true; // Indicate that Html5Qrcode is active and scanning
      await this.html5QrcodeScanner.start(
        { deviceId: this.selectedCameraId ? { exact: this.selectedCameraId } : undefined, facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        this.onBarcodeScanSuccess.bind(this),
        this.onBarcodeScanFailure.bind(this)
      );
    } catch (error) {
      console.error('Error starting Html5Qrcode scanner:', error);
      this.notificationService.showError('Failed to start camera for scanning.');
      this.isScanningBarcode = false;
    }
  }

  async onBarcodeScanSuccess(decodedText: string): Promise<void> {
    // No need to stop Html5Qrcode here, it continues running for OCR preview
    // this.stopHtml5QrcodeCamera(); // Keep camera running for OCR preview
    this.notificationService.showSuccess(`Barcode Scanned: ${decodedText}`, 'Product Found!');

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
      this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
      this.selectedCameraId = this.cameras[this.currentCameraIndex].deviceId;
      localStorage.setItem('fatBoySelectedCamera', this.selectedCameraId);
      this.startHtml5QrcodeCamera(); // Restart Html5Qrcode with new camera
    } else {
      this.notificationService.showInfo('Only one camera found.');
    }
  }

  async captureLabelForOcr(): Promise<void> {
    if (this.isProcessingOcr || !this.html5QrcodeScanner.isScanning) return;

    this.isProcessingOcr = true;
    this.notificationService.showInfo('Processing label...', 'OCR in progress');

    try {
      // Get the video element managed by Html5Qrcode
      const videoElement = document.querySelector('#reader video') as HTMLVideoElement;
      if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
        this.notificationService.showWarning('Camera stream not ready for OCR. Please try again.');
        this.isProcessingOcr = false;
        return;
      }

      const canvas = this.canvasElement.nativeElement;
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.notificationService.showError('Failed to get canvas context.');
        this.isProcessingOcr = false;
        return;
      }

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const result = await Tesseract.recognize(dataUrl, 'eng');
      const text = result.data?.text || '';

      if (!text || text.trim().length === 0) {
        this.notificationService.showWarning('No text detected. Please adjust lighting and try again.');
        this.isProcessingOcr = false;
        return;
      }

      this.processExtractedText(text);
    } catch (err) {
      console.error('OCR error:', err);
      this.notificationService.showError('Failed to process the image. Please try again.');
      this.isProcessingOcr = false;
    }
  }

  private processExtractedText(text: string): void {
    // No need to stop camera here, Html5Qrcode continues running
    // this.stopHtml5QrcodeCamera(); 

    const enhancedIngredients = this.ocrEnhancer.enhanceIngredientDetection(text);
    const productName = this.ocrEnhancer.detectProductName(text);
    const brand = this.ocrEnhancer.detectBrand(text);

    const categories = this.ingredientParser.categorizeProduct(enhancedIngredients);
    const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences_anonymous') || '{}'); // Use actual user preferences
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

    const product = this.productDb.addProduct(productInfo);
    sessionStorage.setItem('viewingProduct', JSON.stringify(product));
    this.isProcessingOcr = false;
    this.router.navigate(['/ocr-results']);
  }

  private async stopHtml5QrcodeCamera(): Promise<void> {
    if (this.html5QrcodeScanner.isScanning) {
      await this.html5QrcodeScanner.stop().catch(err => console.warn('Error stopping Html5Qrcode scanner on destroy:', err));
      this.isScanningBarcode = false;
    }
  }

  ngOnDestroy(): void {
    this.stopHtml5QrcodeCamera();
    this.speechService.stopListening();
    if (this.voiceCommandSubscription) {
      this.voiceCommandSubscription.unsubscribe();
    }
  }
}