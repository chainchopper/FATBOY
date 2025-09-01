-- Create a table to store community contributions
CREATE TABLE public.community_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  ingredients TEXT,
  notes TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  likes INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for comments on contributions
CREATE TABLE public.contribution_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID REFERENCES public.community_contributions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for both tables
ALTER TABLE public.community_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_comments ENABLE ROW LEVEL SECURITY;

-- Policies for Contributions:
-- Anyone can view approved contributions.
CREATE POLICY "public_read_approved_contributions" ON public.community_contributions FOR SELECT USING (status = 'approved');
-- Authenticated users can create new contributions.
CREATE POLICY "authenticated_insert_contributions" ON public.community_contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Users can see their own pending/rejected contributions.
CREATE POLICY "user_read_own_contributions" ON public.community_contributions FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Users can update the likes on any contribution.
CREATE POLICY "authenticated_update_likes" ON public.community_contributions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policies for Comments:
-- Anyone can read comments.
CREATE POLICY "public_read_comments" ON public.contribution_comments FOR SELECT USING (true);
-- Authenticated users can create comments.
CREATE POLICY "authenticated_insert_comments" ON public.contribution_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Users can delete their own comments.
CREATE POLICY "user_delete_own_comments" ON public.contribution_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);