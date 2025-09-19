-- Fix clicks table schema - add missing columns
-- This migration adds all the missing columns that our application expects

-- First, let's check what columns exist and add the missing ones
DO $$ 
BEGIN
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'created_at') THEN
        ALTER TABLE public.clicks ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add browser column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'browser') THEN
        ALTER TABLE public.clicks ADD COLUMN browser TEXT;
    END IF;

    -- Add os column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'os') THEN
        ALTER TABLE public.clicks ADD COLUMN os TEXT;
    END IF;

    -- Add device_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'device_type') THEN
        ALTER TABLE public.clicks ADD COLUMN device_type TEXT;
    END IF;

    -- Add country column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'country') THEN
        ALTER TABLE public.clicks ADD COLUMN country TEXT;
    END IF;

    -- Add country_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'country_name') THEN
        ALTER TABLE public.clicks ADD COLUMN country_name TEXT;
    END IF;

    -- Add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'city') THEN
        ALTER TABLE public.clicks ADD COLUMN city TEXT;
    END IF;

    -- Add region column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'region') THEN
        ALTER TABLE public.clicks ADD COLUMN region TEXT;
    END IF;

    -- Add referer column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'referer') THEN
        ALTER TABLE public.clicks ADD COLUMN referer TEXT;
    END IF;

    -- Add fingerprint column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'fingerprint') THEN
        ALTER TABLE public.clicks ADD COLUMN fingerprint TEXT;
    END IF;

    -- Add is_unique column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'is_unique') THEN
        ALTER TABLE public.clicks ADD COLUMN is_unique BOOLEAN DEFAULT false;
    END IF;

    -- Add user_agent column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'user_agent') THEN
        ALTER TABLE public.clicks ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON public.clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON public.clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_ip_address ON public.clicks(ip_address);
CREATE INDEX IF NOT EXISTS idx_clicks_is_unique ON public.clicks(is_unique);

-- Update any existing records to have created_at if they don't have it
UPDATE public.clicks 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Enable RLS on clicks table
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for clicks - users can only see clicks for their own links
CREATE POLICY "Users can view clicks for their own links" ON public.clicks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.links 
            WHERE links.id = clicks.link_id 
            AND links.user_id = auth.uid()
        )
    );

-- Create RLS policy for inserting clicks (for the track-click function)
CREATE POLICY "Allow insert clicks for track-click function" ON public.clicks
    FOR INSERT WITH CHECK (true);

-- Enable Realtime for clicks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.clicks;
