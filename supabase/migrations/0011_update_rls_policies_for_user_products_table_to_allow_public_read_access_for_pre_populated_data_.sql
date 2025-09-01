-- Update SELECT policy for user_products
DROP POLICY IF EXISTS "Users can view their own products" ON public.user_products;
CREATE POLICY "Users can view their own products and pre-populated data" ON public.user_products
FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR (product_data->>'type' = 'pre_populated'));

-- Ensure other policies remain user-specific for non-pre_populated types
-- (These policies already exist and are user-specific, so no change needed for INSERT/UPDATE/DELETE here,
-- as the Edge Function will use the service role key to bypass RLS for 'pre_populated' inserts.)