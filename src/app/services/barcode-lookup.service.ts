import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from './product-db.service';

interface BarcodeLookupResponse {
  products: any[];
}

@Injectable({
  providedIn: 'root'
})
export class BarcodeLookupService {
  private baseUrl = 'https://api.barcodelookup.com/v3/products';
  private apiKey = environment.barcodeLookupApiKey;

  constructor(private http: HttpClient) {}

  private parseCalories(nutritionFacts: string): number | undefined {
    if (!nutritionFacts) return undefined;
    const match = nutritionFacts.match(/Energy (\d+)\s*KCAL/i) || nutritionFacts.match(/Calories (\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  async getProductByBarcode(barcode: string): Promise<Partial<Product> | null> {
    const url = `${this.baseUrl}?barcode=${encodeURIComponent(barcode)}&key=${this.apiKey}`;
    
    try {
      const res = await lastValueFrom(this.http.get<BarcodeLookupResponse>(url));

      if (!res || !res.products || res.products.length === 0) {
        return null;
      }

      const p = res.products[0];

      const ingredients: string[] = p.ingredients 
        ? p.ingredients.split(/,/).map((i: string) => i.trim().replace('.', '')).filter((i: string) => i.length > 0)
        : [];

      const calories = this.parseCalories(p.nutrition_facts);
      const image = p.images && p.images.length > 0 ? p.images[0] : undefined;

      return {
        barcode: p.barcode_number,
        name: p.title || 'Unknown Product',
        brand: p.brand || 'Unknown Brand',
        ingredients,
        calories,
        image
      };

    } catch (error) {
      console.error('Barcode Lookup API Error:', error);
      return null;
    }
  }
}