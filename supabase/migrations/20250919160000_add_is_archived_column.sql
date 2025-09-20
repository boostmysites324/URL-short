-- Add is_archived column to links table
ALTER TABLE links ADD COLUMN is_archived BOOLEAN DEFAULT false;

-- No need to update existing links since 'archived' is not a valid status value
-- All existing links will have is_archived = false by default

-- Create index for better performance
CREATE INDEX idx_links_is_archived ON links(is_archived);

-- Update RLS policies to include is_archived
DROP POLICY IF EXISTS "Users can view their own links" ON links;
DROP POLICY IF EXISTS "Users can insert their own links" ON links;
DROP POLICY IF EXISTS "Users can update their own links" ON links;
DROP POLICY IF EXISTS "Users can delete their own links" ON links;

-- Create new RLS policies
CREATE POLICY "Users can view their own active links" ON links
  FOR SELECT USING (auth.uid() = user_id AND is_archived = false);

CREATE POLICY "Users can view their own archived links" ON links
  FOR SELECT USING (auth.uid() = user_id AND is_archived = true);

CREATE POLICY "Users can insert their own links" ON links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links" ON links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links" ON links
  FOR DELETE USING (auth.uid() = user_id);
