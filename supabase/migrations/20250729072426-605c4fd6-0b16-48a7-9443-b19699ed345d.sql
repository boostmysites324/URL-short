-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.analytics_daily (link_id, date, total_clicks, unique_clicks)
    VALUES (
        NEW.link_id, 
        DATE(NEW.clicked_at), 
        1, 
        CASE WHEN NEW.is_unique THEN 1 ELSE 0 END
    )
    ON CONFLICT (link_id, date)
    DO UPDATE SET
        total_clicks = analytics_daily.total_clicks + 1,
        unique_clicks = analytics_daily.unique_clicks + CASE WHEN NEW.is_unique THEN 1 ELSE 0 END;
    
    RETURN NEW;
END;
$$;