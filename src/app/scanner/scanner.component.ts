import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Html5Qrcode } from 'html5-qrcode';
import { OpenFoodFactsService } from '../services/open-food-facts.service';
import { SpeechService } from '../services/speech.service';
import { AuthService } from '../services/auth.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.css']
})
export class ScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('reader') reader!: ElementRef;
  private html5QrcodeScanner!: Html5Qrcode;
  isScanning = false;
  isVoiceListening = false;

  constructor(
    private router: Router,
    private offService: OpenFoodFactsService,
    private speechService: SpeechService,
    private authService: AuthService
  ) {}

  async ngAfterViewInit() {
    try {
      this.html5QrcodeScanner = new Html5Qrcode("reader");
      this.checkVoiceCommandsPreference();
    } catch (error) {
      console.error('Error initializing scanner:', error);
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

  async startScanning() {
    try {
      this.isScanning = true;
      await this.html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        this.onScanSuccess.bind(this),
        this.onScanFailure.bind(this)
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
      this.isScanning = false;
    }
  }

  stopScanning() {
    this.html5QrcodeScanner.stop().then(() => {
      this.isScanning = false;
    }).catch((error) => {
      console.error('Error stopping scanner:', error);
    });
  }

  // Fetch real product data from Open Food Facts and navigate to results
  async onScanSuccess(decodedText: string): Promise<void> {
    this.stopScanning();

    // Try to fetch real product data from Open Food Facts
    const productFromApi = await this.offService.getProductByBarcode(decodedText);

    // If the API yields no ingredients, keep behavior usable by falling back to minimal data
    const product = {
      barcode: productFromApi.barcode,
      name: productFromApi.name || "Sample Product",
      brand: productFromApi.brand || "Sample Brand",
      ingredients: Array.isArray(productFromApi.ingredients) && productFromApi.ingredients.length > 0
        ? productFromApi.ingredients
        : ["Ingredients not available"],
      calories: productFromApi.calories ?? undefined,
      image: productFromApi.image || "https://via.placeholder.com/150"
    };

    sessionStorage.setItem('scannedProduct', JSON.stringify(product));
    this.router.navigate(['/results']);
  }

  onScanFailure(error: string) {
    // Optional: show a subtle, non-blocking error in the future
  }

  ngOnDestroy() {
    if (this.html5QrcodeScanner && this.isScanning) {
      this.stopScanning();
    }
    this.speechService.stopListening(); // Stop listening when component is destroyed
  }
}