import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Shorten URL function called with:', req.method, req.url);
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    const { 
      url, 
      customDomain, 
      expiresAt, 
      password, 
      analyticsEnabled,
      customAlias,
      description,
      channelId,
      campaignId,
      pixelIds,
      redirectType
    } = requestBody;

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from request headers
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id;
    }

    // Generate unique short code or use custom alias
    let shortCode = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    if (customAlias) {
      // Check if custom alias is available
      const { data: existingLink } = await supabaseClient
        .from('links')
        .select('id')
        .eq('short_code', customAlias)
        .single();
      
      if (existingLink) {
        return new Response(
          JSON.stringify({ error: 'Custom alias already exists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      shortCode = customAlias;
      isUnique = true;
    } else {
      while (!isUnique && attempts < maxAttempts) {
        const { data: generatedCode } = await supabaseClient.rpc('generate_short_code');
        shortCode = generatedCode;
        
        const { data: existingLink } = await supabaseClient
          .from('links')
          .select('id')
          .eq('short_code', shortCode)
          .single();
        
        if (!existingLink) {
          isUnique = true;
        }
        attempts++;
      }
    }

    if (!isUnique) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique short code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate short URL with custom domain or default
    let domain = 'http://localhost:8081'; // Default for development
    let shortUrl = '';
    
    if (customDomain) {
      // Use custom domain if provided and valid
      domain = `https://${customDomain}`;
      shortUrl = `${domain}/${shortCode}`;
      console.log('Using custom domain:', domain);
    } else {
      // Use default localhost for development
      shortUrl = `${domain}/s/${shortCode}`;
      console.log('Using default domain:', domain);
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Insert link into database
    const { data: link, error } = await supabaseClient
      .from('links')
      .insert({
        user_id: userId,
        original_url: url,
        short_code: shortCode,
        short_url: shortUrl,
        custom_domain: customDomain,
        expires_at: expiresAt,
        password_hash: passwordHash,
        analytics_enabled: analyticsEnabled ?? true,
        title: description,
        description: description,
        channel_id: channelId,
        campaign_id: campaignId,
        custom_alias: customAlias,
        redirect_type: redirectType || 'direct'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create short link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add pixels to link if provided
    if (pixelIds && pixelIds.length > 0) {
      const pixelInserts = pixelIds.map(pixelId => ({
        link_id: link.id,
        pixel_id: pixelId
      }));

      const { error: pixelError } = await supabaseClient
        .from('link_pixels')
        .insert(pixelInserts);

      if (pixelError) {
        console.error('Error adding pixels:', pixelError);
        // Don't fail the entire operation for pixel errors
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: link.id,
          originalUrl: link.original_url,
          shortUrl: link.short_url,
          shortCode: link.short_code,
          createdAt: link.created_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});