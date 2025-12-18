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
    // Parse request body once (for POST requests with password)
    let requestBody: any = {};
    try {
      if (req.method === 'POST') {
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
      requestBody = await req.json();
        }
      }
    } catch (e) {
      console.log('No request body or invalid JSON');
    }
    
    // Get short code from URL query parameter (primary), request body (for password), or URL path
    const url = new URL(req.url);
    let shortCode = url.searchParams.get('code') || requestBody.code;
    
    if (!shortCode) {
      // Fallback to URL path parsing
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
        
        // For GET requests (direct access), redirect to password page
        if (req.method === 'GET') {
          const requestUrl = new URL(req.url);
          const domain = requestUrl.hostname;
          const protocol = requestUrl.protocol;
          return new Response(null, {
            status: 302,
            headers: {
              'Location': `${protocol}//${domain}/password/${shortCode}`,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
        
        // For POST requests (from React), return JSON
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
        
        // For GET requests, redirect back with error
        if (req.method === 'GET') {
          const requestUrl = new URL(req.url);
          const domain = requestUrl.hostname;
          const protocol = requestUrl.protocol;
          return new Response(null, {
            status: 302,
            headers: {
              'Location': `${protocol}//${domain}/password/${shortCode}?error=invalid`,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
        
        // For POST requests (from React), return JSON with error
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
    if (clientIP === '127.0.0.1' || clientIP === '::1') {
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

    // Get geolocation data with multiple fallback APIs
    let geoData = {
      country: null, // Use null for VARCHAR(2) constraint
      country_name: 'Unknown',
      city: 'Unknown',
      region: 'Unknown'
    };

    // Try multiple geolocation APIs for better reliability
    const geoApis = [
      // Primary: ipapi.co (free, 1000 requests/day)
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        try {
          const response = await fetch(`https://ipapi.co/${normalizedIP}/json/`, {
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (response.ok) {
            const geo = await response.json();
            return {
              country: geo.country_code || null,
              country_name: geo.country_name || null,
              city: geo.city || null,
              region: geo.region || null
            };
          }
        } catch (e) {
          clearTimeout(timeout);
        }
        return null;
      },
      // Fallback 1: ip-api.com (free, 45 requests/minute)
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        try {
          const response = await fetch(`http://ip-api.com/json/${normalizedIP}?fields=status,country,countryCode,city,regionName`, {
            signal: controller.signal
      });
          clearTimeout(timeout);
          if (response.ok) {
            const geo = await response.json();
            if (geo.status === 'success') {
              return {
                country: geo.countryCode || null,
                country_name: geo.country || null,
                city: geo.city || null,
                region: geo.regionName || null
              };
            }
          }
        } catch (e) {
          clearTimeout(timeout);
        }
        return null;
      },
      // Fallback 2: ipgeolocation.io (free tier available)
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        try {
          const response = await fetch(`https://api.ipgeolocation.io/ipgeo?ip=${normalizedIP}`, {
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (response.ok) {
            const geo = await response.json();
            return {
              country: geo.country_code2 || null,
              country_name: geo.country_name || null,
              city: geo.city || null,
              region: geo.state_prov || null
            };
          }
        } catch (e) {
          clearTimeout(timeout);
        }
        return null;
      }
    ];

    // Try each API until one succeeds
    for (const geoApi of geoApis) {
      try {
        const result = await geoApi();
        if (result && (result.country || result.country_name)) {
          // Ensure country code is exactly 2 characters or null (VARCHAR(2) constraint)
          let countryCode = result.country || null;
          if (countryCode && typeof countryCode === 'string' && countryCode.length === 2) {
            countryCode = countryCode.toUpperCase();
          } else {
            countryCode = null;
          }
          
        geoData = {
            country: countryCode,
            country_name: result.country_name || null,
            city: result.city || null,
            region: result.region || null
          };
          console.log('✅ Geolocation success:', geoData);
          break; // Success, stop trying other APIs
      }
      } catch (error) {
        console.log('Geolocation API failed, trying next...', error);
        continue; // Try next API
      }
    }

    // If we still don't have country, log it
    if (!geoData.country && !geoData.country_name) {
      console.log('⚠️ Geolocation failed for IP:', normalizedIP);
    }

    // Parse user agent for device/browser info
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';
    
    // Detect source platform (where the link was shared/opened from)
    // Priority: 1) Referer (external websites first), 2) User Agent, 3) UTM Parameter, 4) Direct
    // For unknown platforms: Shows the actual domain name from referer
    let sourcePlatform = 'Direct';
    const userAgentLower = userAgent.toLowerCase();
    const refererLower = referer ? referer.toLowerCase() : '';
    
    // FIRST: Check if referer is an external website (not our domain)
    // This handles cases where links are embedded in other websites (like t20cricketid.com)
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererHost = refererUrl.hostname.toLowerCase();
        
        // Check if referer is NOT our own domain
        const isOurDomain = refererHost.includes('vercel.app') || 
                           refererHost.includes('swift-link') ||
                           refererHost.includes('247l.ink');
        
        if (!isOurDomain && refererHost && refererHost !== '') {
          // Referer is an external website - use it as source platform
          // Check for known platforms first
          if (refererLower.includes('wa.me') || 
              refererLower.includes('whatsapp.com') ||
              refererLower.includes('chat.whatsapp.com') ||
              refererLower.includes('web.whatsapp.com')) {
            sourcePlatform = 'WhatsApp';
          } else if (refererHost.includes('facebook.com') || refererHost.includes('fb.com')) {
            sourcePlatform = 'Facebook';
          } else if (refererHost.includes('twitter.com') || refererHost.includes('x.com')) {
            sourcePlatform = 'Twitter';
          } else if (refererHost.includes('instagram.com')) {
            sourcePlatform = 'Instagram';
          } else if (refererHost.includes('linkedin.com')) {
            sourcePlatform = 'LinkedIn';
          } else if (refererHost.includes('pinterest.com')) {
            sourcePlatform = 'Pinterest';
          } else if (refererHost.includes('reddit.com')) {
            sourcePlatform = 'Reddit';
          } else if (refererHost.includes('tiktok.com')) {
            sourcePlatform = 'TikTok';
          } else if (refererHost.includes('youtube.com') || refererHost.includes('youtu.be')) {
            sourcePlatform = 'YouTube';
          } else if (refererHost.includes('t.me')) {
            sourcePlatform = 'Telegram';
          } else if (refererHost.includes('snapchat.com')) {
            sourcePlatform = 'Snapchat';
          } else if (refererHost.includes('discord.com')) {
            sourcePlatform = 'Discord';
          } else if (refererHost.includes('slack.com')) {
            sourcePlatform = 'Slack';
          } else if (refererHost.includes('messenger.com')) {
            sourcePlatform = 'Messenger';
          } else {
            // For unknown external websites, show the actual domain name
            let cleanHost = refererHost.replace('www.', '').replace('m.', '');
            const parts = cleanHost.split('.');
            if (parts.length > 2) {
              cleanHost = parts.slice(-2).join('.');
            }
            sourcePlatform = cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1);
          }
        }
      } catch (e) {
        // If referer is not a valid URL, ignore it
      }
    }
    
    // SECOND: Check user agent for messaging apps and social platforms (only if not already detected)
    if (sourcePlatform === 'Direct') {
      if (userAgentLower.includes('whatsapp')) {
        sourcePlatform = 'WhatsApp';
      } else if (userAgentLower.includes('telegram')) {
        sourcePlatform = 'Telegram';
      } else if (userAgentLower.includes('facebook') || userAgentLower.includes('fbios') || userAgentLower.includes('fban')) {
        sourcePlatform = 'Facebook';
      } else if (userAgentLower.includes('twitter') || userAgentLower.includes('tweetie')) {
        sourcePlatform = 'Twitter';
      } else if (userAgentLower.includes('instagram')) {
        sourcePlatform = 'Instagram';
      } else if (userAgentLower.includes('linkedin')) {
        sourcePlatform = 'LinkedIn';
      } else if (userAgentLower.includes('pinterest')) {
        sourcePlatform = 'Pinterest';
      } else if (userAgentLower.includes('reddit')) {
        sourcePlatform = 'Reddit';
      } else if (userAgentLower.includes('snapchat')) {
        sourcePlatform = 'Snapchat';
      } else if (userAgentLower.includes('tiktok')) {
        sourcePlatform = 'TikTok';
      } else if (userAgentLower.includes('wechat')) {
        sourcePlatform = 'WeChat';
      } else if (userAgentLower.includes('line')) {
        sourcePlatform = 'Line';
      } else if (userAgentLower.includes('viber')) {
        sourcePlatform = 'Viber';
      } else if (userAgentLower.includes('skype')) {
        sourcePlatform = 'Skype';
      } else if (userAgentLower.includes('discord')) {
        sourcePlatform = 'Discord';
      } else if (userAgentLower.includes('slack')) {
        sourcePlatform = 'Slack';
      } else if (userAgentLower.includes('messenger')) {
        sourcePlatform = 'Messenger';
      }
    }
    
    // Check for UTM source parameter in the request URL
    try {
      const requestUrl = new URL(req.url);
      const utmSource = requestUrl.searchParams.get('utm_source');
      if (utmSource) {
        // Capitalize first letter
        sourcePlatform = utmSource.charAt(0).toUpperCase() + utmSource.slice(1).toLowerCase();
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
    
    // Enhanced mobile detection (do this before WhatsApp detection)
    let deviceType = 'desktop';
    const userAgentUpper = userAgent.toUpperCase();

    if (userAgent.includes('Mobile') || 
        userAgent.includes('Android') ||
        userAgent.includes('iPhone') ||
        userAgent.includes('iPod') ||
        userAgent.includes('BlackBerry') ||
        userAgent.includes('Windows Phone') ||
        userAgent.includes('Opera Mini') ||
        userAgentUpper.includes('MOBILE') ||
        userAgentUpper.includes('IPHONE') ||
        userAgentUpper.includes('ANDROID')) {
      deviceType = 'mobile';
    } else if (userAgent.includes('Tablet') || 
               userAgent.includes('iPad') ||
               userAgentUpper.includes('TABLET') ||
               userAgentUpper.includes('IPAD')) {
      deviceType = 'tablet';
    }
    
    // Special WhatsApp detection: If referer was our own domain + mobile device = WhatsApp
    // WhatsApp mobile app opens links in external browsers with our domain as referer
    if (sourcePlatform === 'Direct' && deviceType === 'mobile') {
      try {
        if (referer) {
          const refererUrl = new URL(referer);
          const refererHost = refererUrl.hostname.toLowerCase();
          const isOurDomain = refererHost.includes('vercel.app') || 
                             refererHost.includes('swift-link') ||
                             refererHost.includes('247l.ink');
          
          if (isOurDomain) {
            // Mobile + our domain referer = WhatsApp (most common case)
            sourcePlatform = 'WhatsApp';
          }
        }
      } catch (e) {
        // Keep as Direct
      }
    }
    
    console.log('📱 Source Platform Detection:', {
      userAgent: userAgent.substring(0, 80),
      referer: referer.substring(0, 80),
      deviceType: deviceType,
      detectedSource: sourcePlatform
    });
    
    // Parse browser and OS
    let browser = 'Unknown';
    let os = 'Unknown';

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
          referer: referer || 'Direct',
          source_platform: sourcePlatform, // Track where link was shared/opened from
          country: geoData.country,
          country_name: geoData.country_name,
          city: geoData.city,
          region: geoData.region,
          browser: browser,
          os: os,
          device_type: deviceType,
          is_unique: isUnique,
          // store the destination at the moment of the click so edits later won't rewrite history
          destination_url: link.original_url,
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

    // For GET requests (direct browser access), return HTTP 302 redirect
    // This makes the redirect instant without any white page or React loading
    if (req.method === 'GET') {
      console.log('✅ TRACK-CLICK: Redirecting (GET) to:', link.original_url);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': link.original_url,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
    
    // For POST requests (from password form), return JSON with URL
    // This allows the React app to handle the redirect client-side
    console.log('✅ TRACK-CLICK: Returning redirect URL (POST):', link.original_url);
    return new Response(JSON.stringify({
      success: true,
      url: link.original_url
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