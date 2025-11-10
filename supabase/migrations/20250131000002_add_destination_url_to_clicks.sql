-- Add destination_url field to clicks table to store the original URL at the time of click
-- This ensures that when a link is edited, the Recent Activity still shows the URL that was actually clicked

-- Add destination_url column if it doesn't exist
DO $$ 
BEGIN
    -- Add destination_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clicks' AND column_name = 'destination_url') THEN
        ALTER TABLE public.clicks ADD COLUMN destination_url TEXT;
    END IF;
END $$;

-- Update existing records to have destination_url if they don't have it
-- This will populate the field with the current original_url from the links table
UPDATE public.clicks 
SET destination_url = links.original_url
FROM public.links 
WHERE clicks.link_id = links.id 
AND clicks.destination_url IS NULL;

-- Create index for better performance when querying by destination_url
CREATE INDEX IF NOT EXISTS idx_clicks_destination_url ON public.clicks(destination_url);

-- Add comment to explain the purpose of this field
COMMENT ON COLUMN public.clicks.destination_url IS 'The original URL that was clicked at the time of the click event. This preserves the historical destination even if the link is later edited.';

