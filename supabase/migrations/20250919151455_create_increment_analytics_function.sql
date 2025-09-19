-- Create a PostgreSQL function to safely increment daily analytics
-- This prevents double counting even if called multiple times concurrently

CREATE OR REPLACE FUNCTION increment_daily_analytics(
    p_link_id UUID,
    p_date DATE,
    p_is_unique BOOLEAN
) RETURNS VOID AS $$
BEGIN
    -- Use INSERT ... ON CONFLICT to handle concurrent calls safely
    INSERT INTO analytics_daily (link_id, date, total_clicks, unique_clicks)
    VALUES (p_link_id, p_date, 1, CASE WHEN p_is_unique THEN 1 ELSE 0 END)
    ON CONFLICT (link_id, date) 
    DO UPDATE SET 
        total_clicks = analytics_daily.total_clicks + 1,
        unique_clicks = analytics_daily.unique_clicks + CASE WHEN p_is_unique THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Ensure there's a unique constraint on (link_id, date) to make ON CONFLICT work
-- Drop the constraint if it exists first, then recreate it
DO $$ 
BEGIN
    -- Try to drop the constraint if it exists
    BEGIN
        ALTER TABLE analytics_daily DROP CONSTRAINT IF EXISTS analytics_daily_link_id_date_unique;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    -- Create the unique constraint
    ALTER TABLE analytics_daily ADD CONSTRAINT analytics_daily_link_id_date_unique UNIQUE (link_id, date);
EXCEPTION
    WHEN duplicate_table THEN NULL; -- Constraint already exists
END $$;
