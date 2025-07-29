-- Create enum types for better data integrity
CREATE TYPE link_status AS ENUM ('active', 'inactive', 'expired');
CREATE TYPE device_type AS ENUM ('desktop', 'mobile', 'tablet', 'unknown');
CREATE TYPE browser_type AS ENUM ('chrome', 'firefox', 'safari', 'edge', 'opera', 'whatsapp', 'telegram', 'other');
CREATE TYPE os_type AS ENUM ('windows', 'macos', 'linux', 'android', 'ios', 'other');

-- Create links table to store shortened URLs
CREATE TABLE public.links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    short_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    status link_status DEFAULT 'active',
    password_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    custom_domain TEXT,
    analytics_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clicks table for tracking click events
CREATE TABLE public.clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id UUID REFERENCES public.links(id) ON DELETE CASCADE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    country VARCHAR(2),
    country_name TEXT,
    city TEXT,
    region TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    device_type device_type DEFAULT 'unknown',
    browser_type browser_type DEFAULT 'other',
    browser_version TEXT,
    os_type os_type DEFAULT 'other',
    os_version TEXT,
    language VARCHAR(10),
    is_unique BOOLEAN DEFAULT true,
    fingerprint TEXT, -- For unique click detection
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_daily table for aggregated daily stats
CREATE TABLE public.analytics_daily (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id UUID REFERENCES public.links(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    total_clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(link_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies for links table
CREATE POLICY "Users can view their own links" ON public.links
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create links" ON public.links
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own links" ON public.links
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links" ON public.links
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for clicks table
CREATE POLICY "Users can view clicks for their links" ON public.clicks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.links 
            WHERE links.id = clicks.link_id 
            AND (links.user_id = auth.uid() OR links.user_id IS NULL)
        )
    );

CREATE POLICY "Anyone can insert clicks" ON public.clicks
    FOR INSERT WITH CHECK (true);

-- RLS Policies for analytics_daily table
CREATE POLICY "Users can view analytics for their links" ON public.analytics_daily
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.links 
            WHERE links.id = analytics_daily.link_id 
            AND (links.user_id = auth.uid() OR links.user_id IS NULL)
        )
    );

CREATE POLICY "System can manage analytics" ON public.analytics_daily
    FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_links_user_id ON public.links(user_id);
CREATE INDEX idx_links_short_code ON public.links(short_code);
CREATE INDEX idx_links_created_at ON public.links(created_at DESC);
CREATE INDEX idx_clicks_link_id ON public.clicks(link_id);
CREATE INDEX idx_clicks_clicked_at ON public.clicks(clicked_at DESC);
CREATE INDEX idx_clicks_fingerprint ON public.clicks(fingerprint);
CREATE INDEX idx_analytics_daily_link_date ON public.analytics_daily(link_id, date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at on links
CREATE TRIGGER update_links_updated_at
    BEFORE UPDATE ON public.links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate short codes
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily analytics
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.analytics_daily (link_id, date, total_clicks, unique_clicks)
    VALUES (
        NEW.link_id, 
        DATE(NEW.clicked_at), 
        1, 
        CASE WHEN NEW.is_unique THEN 1 ELSE 0 END
    )
    ON CONFLICT (link_id, date)
    DO UPDATE SET
        total_clicks = analytics_daily.total_clicks + 1,
        unique_clicks = analytics_daily.unique_clicks + CASE WHEN NEW.is_unique THEN 1 ELSE 0 END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update daily analytics when clicks are inserted
CREATE TRIGGER update_analytics_on_click
    AFTER INSERT ON public.clicks
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_analytics();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clicks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_daily;