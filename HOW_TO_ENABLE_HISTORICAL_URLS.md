# How to Enable Historical URL Tracking

## Problem
When you edit a link's destination URL, the Recent Activity section in Link Analytics shows the NEW URL instead of the URL that was actually clicked at the time.

## Solution
Run the SQL migration to add the `destination_url` field to the clicks table.

## Steps

### 1. Open Supabase Dashboard
- Go to https://supabase.com/dashboard
- Select your project

### 2. Open SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Run This SQL
Copy and paste the following SQL code:

```sql
-- Add destination_url column to preserve historical URLs
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS destination_url TEXT;

-- Backfill existing records
UPDATE public.clicks 
SET destination_url = links.original_url
FROM public.links 
WHERE clicks.link_id = links.id 
  AND clicks.destination_url IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_clicks_destination_url ON public.clicks(destination_url);
```

### 4. Click "Run"

### 5. Test
- Go to your Link Analytics page
- The Recent Activity section will now show:
  - An arrow (→) before the destination URL
  - The URL that was actually clicked at that point in time
  - Even if you edit the link later, old clicks will still show the old URL

## What This Does

✅ **Preserves History**: Each click stores the destination URL at the moment it happened
✅ **Accurate Analytics**: You can see which URL users actually clicked
✅ **Edit Freedom**: You can update your links without losing historical data
✅ **Visual Indicator**: The arrow (→) and blue color highlight the historical destination

## Result

Before: All clicks show the current destination URL
After: Each click shows the URL that was active when it was clicked

This is especially useful when you:
- Update broken links
- Change campaign URLs
- Redirect links to new destinations
- Test different landing pages


