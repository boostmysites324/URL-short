-- Add source_platform column to track where links were shared/opened from
-- This tracks platforms like WhatsApp, Facebook, Twitter, etc.

ALTER TABLE public.clicks 
ADD COLUMN IF NOT EXISTS source_platform TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_clicks_source_platform ON public.clicks(source_platform);

-- Add comment to explain the column
COMMENT ON COLUMN public.clicks.source_platform IS 'Platform where the link was shared or opened from (e.g., WhatsApp, Facebook, Direct)';

