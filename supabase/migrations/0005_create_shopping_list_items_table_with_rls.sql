-- Create shopping_list_items table
CREATE TABLE public.shopping_list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL, -- Client-side generated ID for product
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  image_url TEXT,
  purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Policies for shopping_list_items
CREATE POLICY "Users can view their own shopping list items" ON public.shopping_list_items
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping list items" ON public.shopping_list_items
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping list items" ON public.shopping_list_items
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping list items" ON public.shopping_list_items
FOR DELETE TO authenticated USING (auth.uid() = user_id);