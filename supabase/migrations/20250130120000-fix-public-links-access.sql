-- Fix public access to short links
-- Allow public access to links for redirect purposes

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own links" ON public.links;

-- Create a new policy that allows public access to links
CREATE POLICY "Public can view links for redirects" ON public.links
    FOR SELECT USING (true);

-- Keep the other policies for authenticated users
CREATE POLICY "Users can create links" ON public.links
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own links" ON public.links
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links" ON public.links
    FOR DELETE USING (auth.uid() = user_id);

-- Also allow public access to clicks table for tracking
DROP POLICY IF EXISTS "Users can view clicks for their links" ON public.clicks;

CREATE POLICY "Public can insert clicks" ON public.clicks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view clicks for their links" ON public.clicks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.links 
            WHERE links.id = clicks.link_id 
            AND (links.user_id = auth.uid() OR links.user_id IS NULL)
        )
    );

-- Allow public access to analytics_daily for tracking
DROP POLICY IF EXISTS "Users can view analytics for their links" ON public.analytics_daily;

CREATE POLICY "Public can insert analytics" ON public.analytics_daily
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update analytics" ON public.analytics_daily
    FOR UPDATE USING (true);

CREATE POLICY "Users can view analytics for their links" ON public.analytics_daily
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.links 
            WHERE links.id = analytics_daily.link_id 
            AND (links.user_id = auth.uid() OR links.user_id IS NULL)
        )
    );
