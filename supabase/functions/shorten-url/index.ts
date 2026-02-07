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

    // Helper to generate a random base62 code
    const generateRandomCode = (length: number = 7) => {
      const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }
      return result;
    };

    // Generate unique short code or use custom alias
    let shortCode = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    if (customAlias) {
      // Validate custom alias length (max 15 characters)
      if (customAlias.length > 15) {
        return new Response(
          JSON.stringify({ error: 'Custom alias must be 15 characters or less' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Validate custom alias format (3-15 chars, alphanumerics, hyphen and underscore)
      const aliasRegex = /^[A-Za-z0-9-_]{3,15}$/;
      if (!aliasRegex.test(customAlias)) {
        return new Response(
          JSON.stringify({ error: 'Custom alias must be 3-15 characters and contain only letters, numbers, hyphens, or underscores' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
        let generated: string | null = null;
        try {
          const { data: generatedCode, error: rpcError } = await supabaseClient.rpc('generate_short_code');
          if (rpcError) {
            console.warn('RPC generate_short_code failed, falling back to random generator:', rpcError.message);
          }
          generated = generatedCode ?? null;
        } catch (e) {
          console.warn('RPC generate_short_code threw, falling back to random generator');
        }

        shortCode = generated || generateRandomCode(7);

        const { data: existingLink } = await supabaseClient
          .from('links')
          .select('id')
          .eq('short_code', shortCode)
          .maybeSingle();

        if (!existingLink) {
          isUnique = true;
        }
        attempts++;
      }
    }

    if (!isUnique) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique short code after multiple attempts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate short URL with custom domain or auto-detect from request
    let domain = '';
    let shortUrl = '';
    
    if (customDomain) {
      // Use custom domain if provided and valid
      domain = `https://${customDomain}`;
      shortUrl = `${domain}/s/${shortCode}`;
      console.log('Using custom domain:', domain);
    } else {
      // Auto-detect domain from request origin or referer
      const origin = req.headers.get('origin') || req.headers.get('referer');
      if (origin) {
        try {
          const originUrl = new URL(origin);
          domain = `${originUrl.protocol}//${originUrl.hostname}`;
          console.log('Using detected domain from origin:', domain);
        } catch (e) {
          domain = 'https://247l.ink';
          console.log('Failed to parse origin, using fallback domain:', domain);
        }
      } else {
        domain = 'https://247l.ink';
        console.log('No origin/referer header, using fallback domain:', domain);
      }
      shortUrl = `${domain}/s/${shortCode}`;
      console.log('Using auto-detected domain:', domain);
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    if (password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Validate UUID format for channelId and campaignId
    // UUID regex: 8-4-4-4-12 hexadecimal characters
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    let validatedChannelId: string | null = null;
    let validatedCampaignId: string | null = null;
    
    if (channelId) {
      if (typeof channelId === 'string' && channelId.trim() !== '') {
        if (uuidRegex.test(channelId.trim())) {
          validatedChannelId = channelId.trim();
        } else {
          return new Response(
            JSON.stringify({ error: 'Invalid channel ID format. Channel ID must be a valid UUID.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    if (campaignId) {
      if (typeof campaignId === 'string' && campaignId.trim() !== '') {
        if (uuidRegex.test(campaignId.trim())) {
          validatedCampaignId = campaignId.trim();
        } else {
          return new Response(
            JSON.stringify({ error: 'Invalid campaign ID format. Campaign ID must be a valid UUID.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
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
        channel_id: validatedChannelId,
        campaign_id: validatedCampaignId,
        custom_alias: customAlias,
        redirect_type: redirectType || 'direct'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to create short link';
      if (error.message) {
        if (error.message.includes('invalid input syntax for type uuid')) {
          errorMessage = 'Invalid channel or campaign ID. Please use a valid UUID format.';
        } else if (error.message.includes('foreign key constraint')) {
          errorMessage = 'The specified channel or campaign does not exist.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage, details: error?.message || error }),
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
    console.error('Error details:', error.message, error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error?.message || 'An unexpected error occurred',
        details: error?.stack || error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});