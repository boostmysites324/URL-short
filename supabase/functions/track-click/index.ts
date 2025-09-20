import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Track-click function for URL redirection and analytics

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, user-agent, referer, accept-language',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log('🔥 TRACK-CLICK: Function called with method:', req.method, 'at', new Date().toISOString());
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Parse request body once
    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      console.log('No request body or invalid JSON');
    }
    
    // Get short code from request body or URL path
    let shortCode = requestBody.code;
    
    if (!shortCode) {
      // Fallback to URL path parsing
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      shortCode = pathParts[pathParts.length - 1];
    }
    
    if (!shortCode || shortCode === 'track-click') {
      return new Response(JSON.stringify({
        error: 'Short code is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the link from database (public access - no status filter)
    const { data: link, error: linkError } = await supabaseClient
      .from('links')
      .select('id, original_url, password_hash, redirect_type, expires_at, status, analytics_enabled, is_archived')
      .eq('short_code', shortCode)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({
        error: 'Link not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get client IP for tracking
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                    req.headers.get('x-real-ip') || 
                    req.headers.get('cf-connecting-ip') ||
                    '127.0.0.1';

    // Check if link is active (only if status is explicitly set to inactive)
    if (link.status && link.status !== 'active') {
      return new Response(JSON.stringify({
        error: 'Link is inactive'
      }), {
        status: 410,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if link has expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({
        error: 'Link has expired'
      }), {
        status: 410,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if link is password protected
    if (link.password_hash) {
      const { password } = requestBody;
      
      if (!password) {
        console.log('🔒 Password required for link:', link.id);
        return new Response(JSON.stringify({
          error: 'Password required',
          requiresPassword: true
        }), {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Verify password
      console.log('🔐 Verifying password for link:', link.id);
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const providedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      console.log('🔐 Password hash comparison:', {
        provided: providedHash.substring(0, 10) + '...',
        stored: link.password_hash.substring(0, 10) + '...',
        match: providedHash === link.password_hash
      });

      if (providedHash !== link.password_hash) {
        console.log('❌ Invalid password for link:', link.id);
        return new Response(JSON.stringify({
          error: 'Invalid password',
          requiresPassword: true
        }), {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      console.log('✅ Password verified for link:', link.id);
    }

    // Skip analytics if disabled for this link or if link is archived
    const shouldTrackAnalytics = link.analytics_enabled !== false && !link.is_archived;
    
    console.log('📊 TRACK-CLICK: Analytics tracking decision:', {
      linkId: link.id,
      analyticsEnabled: link.analytics_enabled,
      isArchived: link.is_archived,
      shouldTrack: shouldTrackAnalytics
    });

    // Get client IP and normalize for localhost
    let normalizedIP = clientIP;
    if (clientIP === '127.0.0.1' || clientIP === 'localhost' || clientIP === '::1') {
      normalizedIP = '127.0.0.1';
    }

    // Check for unique click within last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingClick } = await supabaseClient
      .from('clicks')
      .select('id')
      .eq('link_id', link.id)
      .eq('ip_address', normalizedIP)
      .gte('created_at', oneDayAgo)
      .limit(1);

    const isUnique = !existingClick || existingClick.length === 0;

    // Get geolocation data quickly (skip if slow)
    let geoData = {
      country: 'Unknown',
      country_name: 'Unknown',
      city: 'Unknown',
      region: 'Unknown'
    };

    try {
      // Quick geolocation with 2 second timeout
      const geoController = new AbortController();
      const geoTimeout = setTimeout(() => geoController.abort(), 2000);
      
      const geoResponse = await fetch(`https://ipapi.co/${normalizedIP}/json/`, {
        signal: geoController.signal
      });
      clearTimeout(geoTimeout);
      
      if (geoResponse.ok) {
        const geo = await geoResponse.json();
        geoData = {
          country: geo.country_code || 'Unknown',
          country_name: geo.country_name || 'Unknown',
          city: geo.city || 'Unknown',
          region: geo.region || 'Unknown'
        };
      }
    } catch (geoError) {
      console.log('Geolocation failed or timed out, using defaults:', geoError);
    }

    // Parse user agent for device/browser info
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || 'Direct';
    
    // Simple user agent parsing
    let deviceType = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    if (userAgent.includes('Mobile')) {
      deviceType = 'mobile';
    } else if (userAgent.includes('Tablet')) {
      deviceType = 'tablet';
    }

    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
    }

    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iOS')) {
      os = 'iOS';
    }

    // Insert click record only if analytics is enabled
    if (shouldTrackAnalytics) {
      console.log('🔥 TRACK-CLICK: About to insert click for link_id:', link.id, 'IP:', normalizedIP, 'isUnique:', isUnique);
      const { error: clickError } = await supabaseClient
        .from('clicks')
        .insert({
          link_id: link.id,
          ip_address: normalizedIP,
          user_agent: userAgent,
          referer: referer,
          country: geoData.country,
          country_name: geoData.country_name,
          city: geoData.city,
          region: geoData.region,
          browser: browser,
          os: os,
          device_type: deviceType,
          is_unique: isUnique,
          fingerprint: `${normalizedIP}-${userAgent.slice(0, 50)}`
        });

      if (clickError) {
        console.error('❌ TRACK-CLICK: Error inserting click:', clickError);
        // Still return redirect even if tracking fails
        return new Response(JSON.stringify({
          redirect: true,
          url: link.original_url,
          type: link.redirect_type || 'direct'
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } else {
        console.log('✅ TRACK-CLICK: Click recorded successfully for link_id:', link.id);
      }
    } else {
      console.log('📊 TRACK-CLICK: Analytics disabled for this link, skipping click tracking');
    }

    // Update daily analytics only if analytics is enabled
    if (shouldTrackAnalytics) {
      console.log('🔥 TRACK-CLICK: About to update analytics for link_id:', link.id);
      const today = new Date().toISOString().split('T')[0];
      
      // Use PostgreSQL's ON CONFLICT to handle concurrent updates safely
      const { error: analyticsError } = await supabaseClient
        .rpc('increment_daily_analytics', {
          p_link_id: link.id,
          p_date: today,
          p_is_unique: isUnique
        });

      if (analyticsError) {
        console.error('❌ TRACK-CLICK: Error updating analytics:', analyticsError);
        // Create a fallback manual update
        try {
          const { data: existingAnalytics } = await supabaseClient
            .from('analytics_daily')
            .select('id, total_clicks, unique_clicks')
            .eq('link_id', link.id)
            .eq('date', today)
            .single();

          if (existingAnalytics) {
            await supabaseClient
              .from('analytics_daily')
              .update({
                total_clicks: existingAnalytics.total_clicks + 1,
                unique_clicks: isUnique ? (existingAnalytics.unique_clicks || 0) + 1 : (existingAnalytics.unique_clicks || 0)
              })
              .eq('id', existingAnalytics.id);
          } else {
            await supabaseClient
              .from('analytics_daily')
              .insert({
                link_id: link.id,
                date: today,
                total_clicks: 1,
                unique_clicks: isUnique ? 1 : 0
              });
          }
        } catch (fallbackError) {
          console.error('❌ TRACK-CLICK: Fallback analytics update failed:', fallbackError);
        }
      } else {
        console.log('✅ TRACK-CLICK: Analytics updated successfully using RPC for link_id:', link.id);
      }
    } else {
      console.log('📊 TRACK-CLICK: Analytics disabled for this link, skipping analytics update');
    }

    // Return redirect information
    return new Response(JSON.stringify({
      redirect: true,
      url: link.original_url,
      type: link.redirect_type || 'direct'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error details:', error.message, error.stack);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});