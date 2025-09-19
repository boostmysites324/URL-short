-- Fix the clicks table schema to prevent insertion errors

-- Add missing columns if they don't exist
DO $$ BEGIN
    -- Add device_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='device_type') THEN
        ALTER TABLE clicks ADD COLUMN device_type VARCHAR(20);
    END IF;
    
    -- Add browser column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='browser') THEN
        ALTER TABLE clicks ADD COLUMN browser VARCHAR(50);
    END IF;
    
    -- Add os column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='os') THEN
        ALTER TABLE clicks ADD COLUMN os VARCHAR(50);
    END IF;
    
    -- Add country column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='country') THEN
        ALTER TABLE clicks ADD COLUMN country VARCHAR(10);
    END IF;
    
    -- Add country_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='country_name') THEN
        ALTER TABLE clicks ADD COLUMN country_name VARCHAR(100);
    END IF;
    
    -- Add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='city') THEN
        ALTER TABLE clicks ADD COLUMN city VARCHAR(100);
    END IF;
    
    -- Add region column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='region') THEN
        ALTER TABLE clicks ADD COLUMN region VARCHAR(100);
    END IF;
    
    -- Add referer column if it doesn't exist (note: it's referer, not referrer)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='referer') THEN
        ALTER TABLE clicks ADD COLUMN referer TEXT;
    END IF;
    
    -- Add is_unique column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='is_unique') THEN
        ALTER TABLE clicks ADD COLUMN is_unique BOOLEAN DEFAULT false;
    END IF;
    
    -- Add fingerprint column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clicks' AND column_name='fingerprint') THEN
        ALTER TABLE clicks ADD COLUMN fingerprint TEXT;
    END IF;
END $$;

-- Update existing columns to have proper lengths
ALTER TABLE clicks ALTER COLUMN user_agent TYPE TEXT;

-- Make sure ip_address can handle IPv6
ALTER TABLE clicks ALTER COLUMN ip_address TYPE INET;