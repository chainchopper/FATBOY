import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface OpenFoodFactsProduct {
  code: string;
  product: {
    product_name: string;
    brands: string;
    ingredients_text: string;
    nutriments: {
      energy: number;
      energy_kcal: number;
      carbohydrates: number;
      sugars: number;
      fat: number;
      saturated_fat: number;
      proteins: number;
    };
    image_url: string;
    categories: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class OpenFoodFactsService {
  private apiUrl = 'https://world.openfoodfacts.org/api/v0/product';

  constructor(private http: HttpClient) {}

  getProductByBarcode(barcode: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${barcode}.json`).pipe(
      map((response: any) => {
        if (response.status === 1) {
          return response.product;
        } else {
          throw new Error('Product not found');
        }
      }),
      catchError(error => {
        console.error('Error fetching product:', error);
        return of(null);
      })
    );
  }

  searchProducts(query: string): Observable<any> {
    return this.http.get(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1`).pipe(
      map((response: any) => response.products || []),
      catchError(error => {
        console.error('Error searching products:', error);
        return of([]);
      })
    );
  }
}