-- Fix double tracking issue by adding unique constraints and improving the trigger

-- Add unique constraint to prevent duplicate clicks within the same second
-- This will prevent the same IP from creating multiple clicks for the same link within 1 second
ALTER TABLE public.clicks 
ADD CONSTRAINT clicks_link_ip_time_unique 
UNIQUE (link_id, ip_address, DATE_TRUNC('second', clicked_at));

-- Drop the existing trigger to recreate it with better logic
DROP TRIGGER IF EXISTS update_analytics_on_click ON public.clicks;

-- Create a more robust trigger function that handles duplicates better
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    today_date DATE := DATE(NEW.clicked_at);
BEGIN
    -- Use a more robust approach with proper error handling
    BEGIN
        INSERT INTO public.analytics_daily (link_id, date, total_clicks, unique_clicks)
        VALUES (
            NEW.link_id, 
            today_date, 
            1, 
            CASE WHEN NEW.is_unique THEN 1 ELSE 0 END
        )
        ON CONFLICT (link_id, date)
        DO UPDATE SET
            total_clicks = analytics_daily.total_clicks + 1,
            unique_clicks = analytics_daily.unique_clicks + CASE WHEN NEW.is_unique THEN 1 ELSE 0 END;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the insert
            RAISE WARNING 'Error updating analytics for link_id %: %', NEW.link_id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_analytics_on_click
    AFTER INSERT ON public.clicks
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_analytics();

-- Add an index to improve performance of the unique constraint
CREATE INDEX IF NOT EXISTS idx_clicks_link_ip_time ON public.clicks(link_id, ip_address, clicked_at);
