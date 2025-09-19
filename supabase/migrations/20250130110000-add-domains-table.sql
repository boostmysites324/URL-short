-- Create domains table for custom domain management
CREATE TABLE public.domains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    domain TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    dns_verification_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(domain)
);

-- Insert default domain for all users
INSERT INTO public.domains (user_id, domain, verified, active, is_default, dns_verification_code)
SELECT 
    id as user_id,
    'localhost:8081' as domain,
    true as verified,
    true as active,
    true as is_default,
    'default' as dns_verification_code
FROM auth.users;

-- Create channels table for link organization
CREATE TABLE public.channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaigns table for marketing campaigns
CREATE TABLE public.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pixels table for tracking integrations
CREATE TABLE public.pixels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('facebook', 'google', 'twitter', 'linkedin', 'tiktok', 'custom')),
    pixel_id TEXT,
    script TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create link_pixels junction table for many-to-many relationship
CREATE TABLE public.link_pixels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id UUID REFERENCES public.links(id) ON DELETE CASCADE NOT NULL,
    pixel_id UUID REFERENCES public.pixels(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(link_id, pixel_id)
);

-- Add new columns to links table
ALTER TABLE public.links 
ADD COLUMN channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
ADD COLUMN custom_alias TEXT,
ADD COLUMN redirect_type TEXT DEFAULT 'direct' CHECK (redirect_type IN ('direct', 'masked', 'splash'));

-- Enable Row Level Security
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_pixels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domains
CREATE POLICY "Users can view their own domains" ON public.domains
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create domains" ON public.domains
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains" ON public.domains
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains" ON public.domains
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for channels
CREATE POLICY "Users can view their own channels" ON public.channels
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create channels" ON public.channels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels" ON public.channels
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channels" ON public.channels
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON public.campaigns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create campaigns" ON public.campaigns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pixels
CREATE POLICY "Users can view their own pixels" ON public.pixels
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create pixels" ON public.pixels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pixels" ON public.pixels
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pixels" ON public.pixels
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for link_pixels
CREATE POLICY "Users can view link pixels for their links" ON public.link_pixels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.links 
            WHERE links.id = link_pixels.link_id 
            AND links.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create link pixels for their links" ON public.link_pixels
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.links 
            WHERE links.id = link_pixels.link_id 
            AND links.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete link pixels for their links" ON public.link_pixels
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.links 
            WHERE links.id = link_pixels.link_id 
            AND links.user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_domains_user_id ON public.domains(user_id);
CREATE INDEX idx_domains_domain ON public.domains(domain);
CREATE INDEX idx_channels_user_id ON public.channels(user_id);
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_pixels_user_id ON public.pixels(user_id);
CREATE INDEX idx_link_pixels_link_id ON public.link_pixels(link_id);
CREATE INDEX idx_link_pixels_pixel_id ON public.link_pixels(pixel_id);

-- Update triggers for updated_at
CREATE TRIGGER update_domains_updated_at
    BEFORE UPDATE ON public.domains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON public.channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pixels_updated_at
    BEFORE UPDATE ON public.pixels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.domains;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pixels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.link_pixels;
