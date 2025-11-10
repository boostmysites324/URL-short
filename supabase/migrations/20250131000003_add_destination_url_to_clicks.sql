-- Add destination_url column to clicks table to preserve historical URLs
-- This ensures that when a link's URL is edited, the analytics still show the URL that was clicked at the time

-- Add destination_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'destination_url') THEN
        ALTER TABLE public.clicks ADD COLUMN destination_url TEXT;
    END IF;
END $$;

-- Backfill existing records with the current original_url from links table
-- This ensures historical clicks have a destination_url
UPDATE public.clicks 
SET destination_url = links.original_url
FROM public.links 
WHERE clicks.link_id = links.id 
AND clicks.destination_url IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_clicks_destination_url ON public.clicks(destination_url);

-- Add comment to explain the purpose of this field
COMMENT ON COLUMN public.clicks.destination_url IS 'The original URL that was clicked at the time of the click event. This preserves the historical destination even if the link is later edited.';


