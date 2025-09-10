// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the Product interface (must match client-side)
interface Product {
  id: string;
  name: string;
  brand: string;
  barcode?: string;
  ingredients: string[];
  calories?: number;
  image?: string;
  verdict: 'good' | 'bad';
  flaggedIngredients: string[];
  scanDate: Date;
  ocrText?: string;
  categories: string[];
  source?: 'scan' | 'ocr' | 'manual' | 'ai_suggestion' | 'external_search';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing "query" in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data.products || data.products.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const products: Product[] = data.products.map((p: any): Product => {
      const ingredientsText: string = p.ingredients_text_en || p.ingredients_text || '';
      const ingredients: string[] = ingredientsText
        ? ingredientsText.split(/[,;]+/g).map((i: string) => i.trim()).filter((i: string) => i.length > 0)
        : (Array.isArray(p.ingredients) ? p.ingredients.map((i: any) => (i && i.text ? String(i.text).trim() : '')).filter((i: string) => i.length > 0) : []);

      const nutriments = p.nutriments || {};
      const kcalServing = nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal'] ?? nutriments['energy-kcal_100g'];
      const calories = typeof kcalServing === 'number' ? Math.round(kcalServing) : undefined;

      const image = p.image_front_url || p.image_url || p.image_small_url || undefined;

      const brand = (typeof p.brands === 'string' && p.brands.length > 0 ? p.brands.split(',')[0].trim() : p.brands_tags && Array.isArray(p.brands_tags) && p.brands_tags.length > 0 ? String(p.brands_tags[0]) : 'Unknown Brand');

      const name = p.product_name_en || p.product_name || query;

      // For externally searched data, we can't know the verdict without user preferences.
      // We'll default to 'good' and let the user evaluate.
      return {
        id: p.code || crypto.randomUUID(),
        name: name,
        brand: brand,
        barcode: p.code || undefined,
        ingredients: ingredients,
        calories: calories,
        image: image,
        verdict: 'good', // Default verdict
        flaggedIngredients: [], // Cannot determine without preferences
        scanDate: new Date(),
        categories: ['external_search'],
        source: 'external_search'
      };
    });

    return new Response(JSON.stringify(products), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    console.error('Edge Function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});