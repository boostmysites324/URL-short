-- Fix the device_type enum and column lengths

-- First, let's see what device_type values exist and fix the enum
-- Drop and recreate device_type enum with proper values
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_type') THEN
        -- Drop the enum if it exists
        DROP TYPE IF EXISTS device_type CASCADE;
    END IF;
    
    -- Create the enum with proper values
    CREATE TYPE device_type AS ENUM ('desktop', 'mobile', 'tablet', 'Desktop', 'Mobile', 'Tablet');
END $$;

-- Update the clicks table to use the new enum
ALTER TABLE clicks 
ALTER COLUMN device_type TYPE device_type USING device_type::text::device_type;

-- Fix column lengths that might be causing "value too long" errors
ALTER TABLE clicks ALTER COLUMN country TYPE VARCHAR(10);
ALTER TABLE clicks ALTER COLUMN country_name TYPE VARCHAR(100);
ALTER TABLE clicks ALTER COLUMN city TYPE VARCHAR(100);
ALTER TABLE clicks ALTER COLUMN region TYPE VARCHAR(100);
ALTER TABLE clicks ALTER COLUMN browser TYPE VARCHAR(50);
ALTER TABLE clicks ALTER COLUMN os TYPE VARCHAR(50);
ALTER TABLE clicks ALTER COLUMN referer TYPE TEXT;
ALTER TABLE clicks ALTER COLUMN user_agent TYPE TEXT;
ALTER TABLE clicks ALTER COLUMN fingerprint TYPE TEXT;

-- Make sure ip_address can handle IPv6
ALTER TABLE clicks ALTER COLUMN ip_address TYPE INET;
