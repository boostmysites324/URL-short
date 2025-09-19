import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const shortCode = pathParts[pathParts.length - 1];
    
    if (!shortCode || shortCode === 'redirect') {
      return new Response('Short code is required', { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Call the track-click function to handle analytics and get redirect URL
    const trackResponse = await supabaseClient.functions.invoke('track-click', {
      body: { code: shortCode },
      headers: {
        'user-agent': req.headers.get('user-agent') || '',
        'referer': req.headers.get('referer') || '',
        'accept-language': req.headers.get('accept-language') || '',
        'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
        'x-real-ip': req.headers.get('x-real-ip') || ''
      }
    });

    if (trackResponse.error) {
      console.error('Track click error:', trackResponse.error);
      return new Response('Link not found', { status: 404 });
    }

    // Get the link details for redirect
    const { data: link, error } = await supabaseClient
      .from('links')
      .select('original_url, status, expires_at, password_hash, redirect_type')
      .eq('short_code', shortCode)
      .single();

    if (error || !link) {
      return new Response('Link not found', { status: 404 });
    }

    if (link.status !== 'active') {
      return new Response('Link is inactive', { status: 410 });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response('Link has expired', { status: 410 });
    }

    // Check for password protection
    if (link.password_hash) {
      // Return a special response that the frontend can handle
      return new Response(
        JSON.stringify({ 
          passwordRequired: true,
          redirectType: link.redirect_type || 'direct'
        }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Handle different redirect types
    if (link.redirect_type === 'masked') {
      // For masked redirects, we could return a page that loads the target in an iframe
      // For now, we'll just redirect normally
      return new Response(null, {
        status: 302,
        headers: {
          'Location': link.original_url,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...corsHeaders
        }
      });
    } else if (link.redirect_type === 'splash') {
      // For splash page redirects, we could return a custom splash page
      // For now, we'll just redirect normally
      return new Response(null, {
        status: 302,
        headers: {
          'Location': link.original_url,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...corsHeaders
        }
      });
    }

    // Default direct redirect
    return new Response(null, {
      status: 302,
      headers: {
        'Location': link.original_url,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Redirect function error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});