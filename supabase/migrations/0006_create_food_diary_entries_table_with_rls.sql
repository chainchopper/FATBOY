-- Create food_diary_entries table
CREATE TABLE public.food_diary_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  product_data JSONB NOT NULL, -- Stores the full product object
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.food_diary_entries ENABLE ROW LEVEL SECURITY;

-- Policies for food_diary_entries
CREATE POLICY "Users can view their own food diary entries" ON public.food_diary_entries
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food diary entries" ON public.food_diary_entries
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food diary entries" ON public.food_diary_entries
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food diary entries" ON public.food_diary_entries
FOR DELETE TO authenticated USING (auth.uid() = user_id);