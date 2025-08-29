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
  isLoading = false;

  constructor(
    private router: Router,
    private foodFactsService: OpenFoodFactsService
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

  async onScanSuccess(decodedText: string) {
    this.stopScanning();
    this.isLoading = true;
    
    try {
      // Try to get product data from Open Food Facts
      const productData = await this.foodFactsService.getProductByBarcode(decodedText).toPromise();
      
      if (productData) {
        // Use real product data
        const product = {
          barcode: decodedText,
          name: productData.product_name || 'Unknown Product',
          brand: productData.brands || 'Unknown Brand',
          ingredients: productData.ingredients_text ? 
            productData.ingredients_text.split(',').map(ing => ing.trim()) : 
            ['Ingredients not available'],
          calories: productData.nutriments?.energy_kcal || 0,
          image: productData.image_url || 'https://via.placeholder.com/150',
          categories: productData.categories ? productData.categories.split(',') : []
        };
        
        sessionStorage.setItem('scannedProduct', JSON.stringify(product));
        this.router.navigate(['/results']);
      } else {
        // Fallback to mock data
        const mockProduct = {
          barcode: decodedText,
          name: "Sample Product",
          brand: "Sample Brand",
          ingredients: ["Water", "High-Fructose Corn Syrup", "Artificial Flavors"],
          calories: 150,
          image: "https://via.placeholder.com/150",
          categories: ["Beverages", "Sweetened"]
        };
        
        sessionStorage.setItem('scannedProduct', JSON.stringify(mockProduct));
        this.router.navigate(['/results']);
      }
    } catch (error) {
      console.error('Error processing product:', error);
      // Fallback to mock data on error
      const mockProduct = {
        barcode: decodedText,
        name: "Sample Product",
        brand: "Sample Brand",
        ingredients: ["Water", "High-Fructose Corn Syrup", "Artificial Flavors"],
        calories: 150,
        image: "https://via.placeholder.com/150",
        categories: ["Beverages", "Sweetened"]
      };
      
      sessionStorage.setItem('scannedProduct', JSON.stringify(mockProduct));
      this.router.navigate(['/results']);
    } finally {
      this.isLoading = false;
    }
  }

  onScanFailure(error: string) {
    console.log('Scan failed:', error);
  }

  ngOnDestroy() {
    if (this.html5QrcodeScanner && this.isScanning) {
      this.stopScanning();
    }
  }
}