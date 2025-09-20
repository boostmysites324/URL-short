-- Temporarily disable the database trigger to prevent double analytics updates
-- We'll handle analytics manually in the track-click function

DROP TRIGGER IF EXISTS update_analytics_on_click ON public.clicks;
