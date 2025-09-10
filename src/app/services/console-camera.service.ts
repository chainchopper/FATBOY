import { Injectable, EventEmitter } from '@angular/core';
import { CameraFeedComponent } from '../camera-feed/camera-feed.component';
import { BarcodeProcessorService } from './barcode-processor.service';
import { OcrProcessorService } from './ocr-processor.service';
import { ProductDbService, Product } from './product-db.service';
import { NotificationService } from './notification.service';
import { AudioService } from './audio.service';
import { AiIntegrationService } from './ai-integration.service';

@Injectable({
  providedIn: 'root'
})
export class ConsoleCameraService {
  public showCameraFeed = false;
  public isProcessingCameraInput = false;
  public cameraInputProcessed = new EventEmitter<Product>();
  public cameraClosed = new EventEmitter<void>();

  private processingAbortController: AbortController | null = null;
  private chatCameraFeedRef: CameraFeedComponent | null = null;

  constructor(
    private barcodeProcessorService: BarcodeProcessorService,
    private ocrProcessorService: OcrProcessorService,
    private productDb: ProductDbService,
    private notificationService: NotificationService,
    private audioService: AudioService,
    private aiService: AiIntegrationService
  ) {}

  public setCameraFeedComponent(component: CameraFeedComponent): void {
    this.chatCameraFeedRef = component;
  }

  public openCamera(): void {
    this.showCameraFeed = true;
    this.isProcessingCameraInput = false;
    this.notificationService.showInfo('Opening the camera now. You can scan a barcode or capture a label.', 'Camera');
  }

  public closeCamera(): void {
    this.showCameraFeed = false;
    this.notificationService.showInfo('Camera closed.', 'Chat Camera');
    this.abortProcessing();
    this.cameraClosed.emit();
  }

  public async handleBarcodeScanned(decodedText: string): Promise<void> {
    if (this.isProcessingCameraInput) return;
    this.isProcessingCameraInput = true;
    this.notificationService.showInfo('Barcode detected from chat camera! Processing...', 'Chat Scan');
    this.processingAbortController = new AbortController();

    try {
      const productInfo = await this.barcodeProcessorService.processBarcode(decodedText, this.processingAbortController.signal);
      if (this.processingAbortController.signal.aborted) throw new Error('Operation aborted');

      if (!productInfo) {
        this.notificationService.showWarning('Product not found or could not be processed.', 'Chat Scan Failed');
        this.audioService.playErrorSound();
        return;
      }

      const savedProduct = await this.productDb.addProduct(productInfo);
      if (!savedProduct) {
        return;
      }

      this.notificationService.showSuccess(`Scanned "${savedProduct.name}"!`, 'Chat Scan Success');
      this.audioService.playSuccessSound();
      this.productDb.setLastViewedProduct(savedProduct); // Use ProductDbService
      this.cameraInputProcessed.emit(savedProduct);

    } catch (error: any) {
      if (error.message === 'Operation aborted') {
        this.notificationService.showInfo('Camera input processing cancelled.', 'Cancelled');
      } else {
        console.error('Barcode processing error from chat camera:', error);
        this.notificationService.showError('Failed to process barcode from chat camera.', 'Error');
        this.audioService.playErrorSound();
      }
    } finally {
      this.isProcessingCameraInput = false;
      this.processingAbortController = null;
      this.chatCameraFeedRef?.resumeBarcodeScanning();
    }
  }

  public async handleImageCaptured(imageDataUrl: string): Promise<void> {
    if (this.isProcessingCameraInput) return;
    this.isProcessingCameraInput = true;
    this.notificationService.showInfo('Image captured from chat camera! Processing for OCR...', 'Chat OCR');
    this.processingAbortController = new AbortController();

    try {
      const productInfo = await this.ocrProcessorService.processImageForOcr(imageDataUrl, this.processingAbortController.signal);
      if (this.processingAbortController.signal.aborted) throw new Error('Operation aborted');

      if (!productInfo) {
        this.notificationService.showWarning('No product data extracted from image.', 'Chat OCR Failed');
        this.audioService.playErrorSound();
        return;
      }

      const savedProduct = await this.productDb.addProduct(productInfo);
      if (!savedProduct) {
        return;
      }

      this.notificationService.showSuccess(`Processed "${savedProduct.name}"!`, 'Chat OCR Success');
      this.audioService.playSuccessSound();
      this.productDb.setLastViewedProduct(savedProduct); // Use ProductDbService
      this.cameraInputProcessed.emit(savedProduct);

    } catch (error: any) {
      if (error.message === 'Operation aborted') {
        this.notificationService.showInfo('Camera input processing cancelled.', 'Cancelled');
      } else {
        console.error('OCR processing error from chat camera:', error);
        this.notificationService.showError('Failed to process image from chat camera.', 'Error');
        this.audioService.playErrorSound();
      }
    } finally {
      this.isProcessingCameraInput = false;
      this.processingAbortController = null;
      this.chatCameraFeedRef?.resumeBarcodeScanning();
    }
  }

  private abortProcessing(): void {
    if (this.processingAbortController) {
      this.processingAbortController.abort();
      this.processingAbortController = null;
    }
    this.isProcessingCameraInput = false;
  }
}