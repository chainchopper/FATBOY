-- Create user_badges table
CREATE TABLE public.user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL, -- e.g., 'first_scan', 'five_scans'
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, badge_id) -- Ensure a user can only unlock a badge once
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Policies for user_badges
CREATE POLICY "Users can view their own badges" ON public.user_badges
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges" ON public.user_badges
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own badges" ON public.user_badges
FOR DELETE TO authenticated USING (auth.uid() = user_id);