-- ═══════════════════════════════════════════════════════════════════════
-- ENABLE HISTORICAL URL TRACKING
-- ═══════════════════════════════════════════════════════════════════════
-- 
-- PURPOSE: Preserve the destination URL that was clicked at the time of each click
--          Even when you edit a link later, analytics will show the original URL
-- 
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run"
-- 4. Refresh your Link Analytics page
-- 
-- ═══════════════════════════════════════════════════════════════════════

-- Add destination_url column to clicks table
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS destination_url TEXT;

-- Backfill existing clicks with the current destination URL from links table
UPDATE public.clicks 
SET destination_url = links.original_url
FROM public.links 
WHERE clicks.link_id = links.id 
  AND clicks.destination_url IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_clicks_destination_url ON public.clicks(destination_url);

-- Add documentation
COMMENT ON COLUMN public.clicks.destination_url IS 
  'The destination URL at the time of the click. Preserves historical data even when links are edited.';

-- ═══════════════════════════════════════════════════════════════════════
-- ✅ DONE! Your Link Analytics will now show historical destination URLs
-- ═══════════════════════════════════════════════════════════════════════


