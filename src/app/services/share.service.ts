import { Injectable } from '@angular/core';
import { NotificationService } from './notification.service';
import { Product } from './product-db.service';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  constructor(private notificationService: NotificationService) { }

  async shareProduct(product: Product): Promise<void> {
    const shareData = {
      title: `Check out this product: ${product.name}`,
      text: `Fat Boy Approved! I found "${product.name}" by ${product.brand} using the Fat Boy app. It's a ${product.verdict} choice for my health goals!`,
      url: `https://fanalogy.io/product/${product.id}`, // Placeholder URL, replace with actual product page
      files: product.image ? [await this.getImageFile(product.image, product.name)] : undefined,
    };

    try {
      if (navigator.share && product.image) {
        // Web Share API for native sharing (mobile)
        await navigator.share(shareData);
        this.notificationService.showSuccess('Product shared successfully!', 'Shared!');
      } else if (navigator.clipboard) {
        // Fallback for desktop or if image sharing is not supported
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        this.notificationService.showInfo('Product link copied to clipboard!', 'Copied!');
      } else {
        this.notificationService.showWarning('Sharing not supported on this device.', 'Share Failed');
      }
    } catch (error) {
      console.error('Error sharing product:', error);
      this.notificationService.showError('Failed to share product.', 'Share Error');
    }
  }

  // Helper to fetch image and convert to File object for Web Share API
  private async getImageFile(imageUrl: string, fileName: string): Promise<File> {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new File([blob], `${fileName}.png`, { type: 'image/png' });
  }
}