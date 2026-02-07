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
  const realIP = req.headers.get('x-real-ip') || 
                 req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                 '';
  const city = req.headers.get('x-vercel-ip-city') || '';
  const country = req.headers.get('x-vercel-ip-country') || '';
  const region = req.headers.get('x-vercel-ip-country-region') || '';

  console.log('🚀 Edge: Real user:', { realIP, city, country, region });

  // Forward to Supabase Edge Function
  const supabaseUrl = `https://ozkuefljvpzpmbrkknfw.supabase.co/functions/v1/track-click?code=${encodeURIComponent(code)}`;

  try {
    const response = await fetch(supabaseUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'x-real-ip': realIP,
        'x-forwarded-for': realIP,
        'x-vercel-ip-city': city,
        'x-vercel-ip-country': country,
        'x-vercel-ip-country-region': region,
        'user-agent': req.headers.get('user-agent') || '',
        'referer': req.headers.get('referer') || '',
      },
    });

    console.log('📡 Supabase response status:', response.status);

    // Handle redirects (301, 302)
    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get('location');
      console.log('🔀 Redirecting to:', location);
      
      if (!location) {
        console.error('❌ No location header in redirect');
        return new Response('Missing redirect location', { status: 502 });
      }

      return Response.redirect(location, response.status);
    }

    // Handle other responses (password protected, errors, etc.)
    const contentType = response.headers.get('content-type') || 'text/plain';
    const body = await response.text();
    
    console.log('📄 Non-redirect response:', { status: response.status, contentType, bodyLength: body.length });

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('❌ Edge function error:', error);
    return new Response('Redirect failed: ' + (error as Error).message, { status: 500 });
  }
}
