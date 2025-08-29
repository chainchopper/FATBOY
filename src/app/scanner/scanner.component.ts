import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Html5Qrcode } from 'html5-qrcode';
import { OpenFoodFactsService } from '../services/open-food-facts.service';

@Component({
  selector: 'app-scanner',
  standalone: true,
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.css']
})
export class ScannerComponent implements AfterViewInit {
  @ViewChild('reader') reader!: ElementRef;
  private html5QrcodeScanner!: Html5Qrcode;
  isScanning = false;

  constructor(
    private router: Router,
    private offService: OpenFoodFactsService
  ) {}

  async ngAfterViewInit() {
    try {
      this.html5QrcodeScanner = new Html5Qrcode("reader");
    } catch (error) {
      console.error('Error initializing scanner:', error);
    }
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
  }
}