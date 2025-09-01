-- Create user_products table (for scanned, saved, avoided products)
CREATE TABLE public.user_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_data JSONB NOT NULL, -- Stores the full Product object
  type TEXT NOT NULL, -- 'scanned', 'saved_approved', 'saved_avoided', 'manual_entry'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

-- Policies for user_products
CREATE POLICY "Users can view their own products" ON public.user_products
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON public.user_products
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON public.user_products
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON public.user_products
FOR DELETE TO authenticated USING (auth.uid() = user_id);