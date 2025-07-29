import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to detect device type
function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/mobile|android|iphone/.test(ua)) return 'mobile';
  return 'desktop';
}

// Helper function to detect browser
function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('whatsapp')) return 'whatsapp';
  if (ua.includes('telegram')) return 'telegram';
  if (ua.includes('chrome')) return 'chrome';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('edge')) return 'edge';
  if (ua.includes('opera')) return 'opera';
  return 'other';
}

// Helper function to detect OS
function detectOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('mac os')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  if (ua.includes('android')) return 'android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  return 'other';
}

// Helper function to get client IP
function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

// Helper function to generate fingerprint for unique detection
function generateFingerprint(ip: string, userAgent: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${ip}:${userAgent}`);
  return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

// Helper function to get geolocation from IP
async function getGeolocation(ip: string) {
  try {
    if (ip === 'unknown' || ip.startsWith('192.168') || ip.startsWith('10.') || ip === '127.0.0.1') {
      return {
        country: 'US',
        country_name: 'United States',
        city: 'Unknown',
        region: 'Unknown'
      };
    }

    // Using ipapi.co for geolocation (free tier)
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_code || 'US',
        country_name: data.country_name || 'United States',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        latitude: data.latitude || null,
        longitude: data.longitude || null
      };
    }
  } catch (error) {
    console.error('Geolocation error:', error);
  }
  
  return {
    country: 'US',
    country_name: 'United States',
    city: 'Unknown',
    region: 'Unknown'
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const shortCode = url.searchParams.get('code');
    
    if (!shortCode) {
      return new Response('Short code is required', { status: 400 });
    }

    // Get link from database
    const { data: link, error: linkError } = await supabaseClient
      .from('links')
      .select('*')
      .eq('short_code', shortCode)
      .eq('status', 'active')
      .single();

    if (linkError || !link) {
      return new Response('Link not found', { status: 404 });
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response('Link has expired', { status: 410 });
    }

    // Get request details
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';
    const ip = getClientIP(req);
    
    // Parse user agent details
    const deviceType = detectDevice(userAgent);
    const browserType = detectBrowser(userAgent);
    const osType = detectOS(userAgent);
    
    // Generate fingerprint for unique detection
    const fingerprint = await generateFingerprint(ip, userAgent);
    
    // Check if this is a unique click (same fingerprint within 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentClick } = await supabaseClient
      .from('clicks')
      .select('id')
      .eq('link_id', link.id)
      .eq('fingerprint', fingerprint)
      .gte('clicked_at', twentyFourHoursAgo)
      .limit(1)
      .single();

    const isUnique = !recentClick;

    // Get geolocation
    const location = await getGeolocation(ip);
    
    // Extract language
    const language = acceptLanguage.split(',')[0]?.split('-')[0] || 'en';

    // Record the click
    const { error: clickError } = await supabaseClient
      .from('clicks')
      .insert({
        link_id: link.id,
        ip_address: ip,
        user_agent: userAgent,
        referer: referer,
        country: location.country,
        country_name: location.country_name,
        city: location.city,
        region: location.region,
        latitude: location.latitude,
        longitude: location.longitude,
        device_type: deviceType,
        browser_type: browserType,
        os_type: osType,
        language: language,
        fingerprint: fingerprint,
        is_unique: isUnique
      });

    if (clickError) {
      console.error('Failed to record click:', clickError);
    }

    // Redirect to original URL
    return new Response(null, {
      status: 302,
      headers: {
        'Location': link.original_url,
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});