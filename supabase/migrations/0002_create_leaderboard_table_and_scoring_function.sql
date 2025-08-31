-- Create leaderboard table to store user scores
CREATE TABLE public.leaderboard (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- Enable Row Level Security for the leaderboard table
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone to read the leaderboard data
CREATE POLICY "leaderboard_public_read_policy" ON public.leaderboard
FOR SELECT USING (true);

-- Create a function to automatically add new users to the leaderboard
CREATE OR REPLACE FUNCTION public.initialize_leaderboard_entry()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.leaderboard (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- Create a trigger to run the initialization function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_leaderboard ON auth.users;
CREATE TRIGGER on_auth_user_created_leaderboard
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_leaderboard_entry();

-- Create a secure function to increment a user's score
CREATE OR REPLACE FUNCTION public.increment_score(points_to_add INT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.leaderboard
  SET
    score = score + points_to_add,
    updated_at = NOW()
  WHERE user_id = auth.uid();
END;
$$;