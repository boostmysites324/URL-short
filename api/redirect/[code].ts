import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;
  
  // Get the REAL user IP from Vercel's headers
  // Vercel provides the real IP in these headers
  const realIP = 
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';
  
  console.log('🌐 Vercel function - Real user IP:', realIP);
  console.log('🌐 All Vercel headers:', req.headers);
  
  // Forward to Supabase Edge Function with the REAL IP
  const supabaseUrl = `https://ozkuefljvpzpmbrkknfw.supabase.co/functions/v1/track-click?code=${code}`;
  
  try {
    const response = await fetch(supabaseUrl, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Pass the REAL user IP to Supabase
        'X-Real-IP': realIP as string,
        'X-Forwarded-For': realIP as string,
        // Pass other important headers
        'User-Agent': req.headers['user-agent'] || '',
        'Referer': req.headers['referer'] || '',
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
      redirect: 'manual', // Don't follow redirects
    });

    // If it's a redirect (302), forward it
    if (response.status === 302) {
      const location = response.headers.get('Location');
      if (location) {
        return res.redirect(302, location);
      }
    }

    // Otherwise, return the response as-is
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error('Error forwarding to Supabase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
