// Vercel Edge Function for ultra-fast redirects with real user geolocation
export const config = {
  runtime: 'edge', // Use Edge Runtime for maximum speed
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const code = url.pathname.split('/').pop();
  
  if (!code) {
    return new Response('Invalid code', { status: 400 });
  }

  // Get REAL user IP and geo data from Vercel Edge
  // These headers contain the actual user's data, not Vercel's server
  const realIP = req.headers.get('x-real-ip') || 
                 req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                 '';
  const city = req.headers.get('x-vercel-ip-city') || '';
  const country = req.headers.get('x-vercel-ip-country') || '';
  const region = req.headers.get('x-vercel-ip-country-region') || '';
  const latitude = req.headers.get('x-vercel-ip-latitude') || '';
  const longitude = req.headers.get('x-vercel-ip-longitude') || '';

  console.log('🚀 Edge Function capturing real user data:', { 
    realIP, 
    city: decodeURIComponent(city), 
    country, 
    region: decodeURIComponent(region)
  });

  // Forward to Supabase Edge Function with real user data
  const supabaseUrl = `https://ozkuefljvpzpmbrkknfw.supabase.co/functions/v1/track-click?code=${encodeURIComponent(code)}`;

  try {
    const response = await fetch(supabaseUrl, {
      method: 'GET',
      redirect: 'manual', // CRITICAL: Don't follow redirects, pass them through
      headers: {
        // Forward real user IP (not Vercel's server IP)
        'x-real-ip': realIP,
        'x-forwarded-for': realIP,
        // Forward real user geolocation
        'x-vercel-ip-city': city,
        'x-vercel-ip-country': country,
        'x-vercel-ip-country-region': region,
        'x-vercel-ip-latitude': latitude,
        'x-vercel-ip-longitude': longitude,
        // Forward other headers
        'user-agent': req.headers.get('user-agent') || '',
        'referer': req.headers.get('referer') || '',
        'accept-language': req.headers.get('accept-language') || '',
      },
    });

    // Immediately pass through 302 redirects (don't wait for analytics)
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location');
      if (location) {
        return new Response(null, {
          status: response.status,
          headers: {
            'Location': location,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }
    }

    // Pass through other responses
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response('Redirect failed', { status: 500 });
  }
}
