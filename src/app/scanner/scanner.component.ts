import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Html5Qrcode } from 'html5-qrcode';

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

  constructor(private router: Router) {}

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

  onScanSuccess(decodedText: string) {
    this.stopScanning();
    
    // Simulate API call with mock data
    const mockProduct = {
      barcode: decodedText,
      name: "Sample Product",
      brand: "Sample Brand",
      ingredients: ["Water", "High-Fructose Corn Syrup", "Artificial Flavors"],
      calories: 150,
      image: "https://via.placeholder.com/150"
    };
    
    // Store product data and navigate to results
    sessionStorage.setItem('scannedProduct', JSON.stringify(mockProduct));
    this.router.navigate(['/results']);
  }

  onScanFailure(error: string) {
    // Handle scan failure
  }

  ngOnDestroy() {
    if (this.html5QrcodeScanner && this.isScanning) {
      this.stopScanning();
    }
  }
}