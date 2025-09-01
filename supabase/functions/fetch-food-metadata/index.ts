// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'; // Use npm: specifier

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace '*' with your frontend's domain in production
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
}

// Helper function to fetch product data from Open Food Facts
async function fetchProductData(foodName: string): Promise<Product | null> {
  const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=1`;
  
  try {
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.products && data.products.length > 0) {
      const p = data.products[0]; // Take the first result

      const ingredientsText: string = p.ingredients_text_en || p.ingredients_text || '';
      const ingredients: string[] = ingredientsText
        ? ingredientsText.split(/[,;]+/g).map((i: string) => i.trim()).filter((i: string) => i.length > 0)
        : (Array.isArray(p.ingredients) ? p.ingredients.map((i: any) => (i && i.text ? String(i.text).trim() : '')).filter((i: string) => i.length > 0) : []);

      const nutriments = p.nutriments || {};
      const kcalServing = nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal'] ?? nutriments['energy-kcal_100g'];
      const calories = typeof kcalServing === 'number' ? Math.round(kcalServing) : undefined;

      const image = p.image_front_url || p.image_url || p.image_small_url || undefined;

      const brand = (typeof p.brands === 'string' && p.brands.length > 0 ? p.brands.split(',')[0].trim() : p.brands_tags && Array.isArray(p.brands_tags) && p.brands_tags.length > 0 ? String(p.brands_tags[0]) : 'Unknown Brand');

      const name = p.product_name_en || p.product_name || foodName; // Use original foodName if product_name not found

      // For pre-populated data, we'll set a default verdict and categories
      const defaultProduct: Product = {
        id: crypto.randomUUID(), // Generate a UUID for the product
        name: name,
        brand: brand,
        barcode: p.code || undefined,
        ingredients: ingredients,
        calories: calories,
        image: image,
        verdict: 'good', // Default to 'good' for pre-populated, can be refined later
        flaggedIngredients: [], // No flagged ingredients for pre-populated
        scanDate: new Date(),
        categories: ['pre_populated'] // Mark as pre_populated category
      };
      return defaultProduct;

    }
  } catch (error) {
    console.error(`Error fetching data for ${foodName}:`, error);
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { food_names } = await req.json();

    if (!Array.isArray(food_names) || food_names.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "food_names" array in request body.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const results: { foodName: string; status: string; product?: Product; error?: string }[] = [];

    for (const foodName of food_names) {
      const productData = await fetchProductData(foodName);

      if (productData) {
        // Check if product already exists to avoid duplicates
        const { data: existingProduct, error: fetchError } = await supabaseClient
          .from('user_products')
          .select('id')
          .eq('product_data->>name', productData.name)
          .eq('product_data->>brand', productData.brand)
          .eq('type', 'pre_populated')
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means 'no rows found'
          console.error(`Error checking for existing product ${productData.name}:`, fetchError);
          results.push({ foodName, status: 'failed', error: fetchError.message });
          continue;
        }

        if (existingProduct) {
          results.push({ foodName, status: 'skipped', error: 'Product already exists' });
          continue;
        }

        // Insert into user_products table
        const { error: insertError } = await supabaseClient
          .from('user_products')
          .insert({
            user_id: '00000000-0000-0000-0000-000000000000', // Dummy user_id for pre_populated data (or a specific admin user ID)
            product_data: productData,
            type: 'pre_populated',
          });

        if (insertError) {
          console.error(`Error inserting ${foodName}:`, insertError);
          results.push({ foodName, status: 'failed', error: insertError.message });
        } else {
          results.push({ foodName, status: 'success', product: productData });
        }
      } else {
        results.push({ foodName, status: 'not_found' });
      }
    }

    return new Response(JSON.stringify(results), {
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