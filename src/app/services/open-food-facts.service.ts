import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

interface OpenFoodFactsResponse {
  status: number;
  product?: any;
}

@Injectable({
  providedIn: 'root'
})
export class OpenFoodFactsService {
  private baseUrl = 'http://api.blacknation.io/product';

  constructor(private http: HttpClient) {}

  async getProductByBarcode(barcode: string): Promise<{
    barcode: string;
    name: string;
    brand: string;
    ingredients: string[];
    calories?: number;
    image?: string;
  }> {
    const url = `${this.baseUrl}/${encodeURIComponent(barcode)}.json`;
    
    try {
      const res = await lastValueFrom(this.http.get<OpenFoodFactsResponse>(url));

      if (!res || res.status !== 1 || !res.product) {
        throw new Error('Product not found or invalid response');
      }

      const p = res.product;

      const ingredientsText: string = p.ingredients_text_en || p.ingredients_text || '';
      const ingredients: string[] = ingredientsText
        ? ingredientsText.split(/[,;]+/g).map((i: string) => i.trim()).filter((i: string) => i.length > 0)
        : (Array.isArray(p.ingredients) ? p.ingredients.map((i: any) => (i && i.text ? String(i.text).trim() : '')).filter((i: string) => i.length > 0) : []);

      const nutriments = p.nutriments || {};
      const kcalServing = nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal'] ?? nutriments['energy-kcal_100g'];
      const calories = typeof kcalServing === 'number' ? Math.round(kcalServing) : undefined;

      const image = p.image_front_url || p.image_url || p.image_small_url || undefined;

      const brand = (typeof p.brands === 'string' && p.brands.length > 0 ? p.brands.split(',')[0].trim() : p.brands_tags && Array.isArray(p.brands_tags) && p.brands_tags.length > 0 ? String(p.brands_tags[0]) : 'Unknown Brand');

      const name = p.product_name_en || p.product_name || 'Unknown Product';

      return { barcode, name, brand, ingredients, calories, image };

    } catch (error) {
      console.error('API Error fetching product:', error);
      // Return a default structure on error to prevent app crash
      return {
        barcode,
        name: 'Product Not Found',
        brand: 'N/A',
        ingredients: ['Could not retrieve ingredients.'],
        calories: undefined,
        image: undefined
      };
    }
  }
}