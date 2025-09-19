import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

const Redirect = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const handleRedirect = async () => {
      // Prevent double execution
      if (hasProcessedRef.current) {
        console.log('Already processed, skipping...');
        return;
      }
      hasProcessedRef.current = true;
      if (!shortCode) {
        setError('Short code is missing.');
        setLoading(false);
        return;
      }

      try {
        // Use the track-click function to handle everything (link lookup, validation, tracking, redirect)
        try {
          console.log('🚀 REDIRECT: Tracking click for short code:', shortCode, 'at', new Date().toISOString());
          const trackResult = await supabase.functions.invoke('track-click', {
            body: { code: shortCode },
            headers: {
              'user-agent': navigator.userAgent,
              'referer': document.referrer,
              'accept-language': navigator.language,
            }
          });
          console.log('Track click result:', trackResult);
          console.log('Track click result data:', trackResult.data);
          console.log('Track click result error:', trackResult.error);
          
          // The track-click function returns JSON with redirect info
          if (trackResult.data) {
            if (trackResult.data.redirect && trackResult.data.url) {
              // Handle all redirect types (direct, masked, splash)
              console.log('Redirecting to:', trackResult.data.url);
              window.location.href = trackResult.data.url;
            } else {
              console.error('Unexpected response format:', trackResult.data);
              setError('Unexpected response from server.');
              setLoading(false);
            }
          } else {
            console.error('No data in response:', trackResult);
            setError('No data received from server.');
            setLoading(false);
          }
        } catch (trackError) {
          console.error('Error with track-click function:', trackError);
          
          // Fallback: try to get the link directly (this might fail due to RLS)
          try {
            const { data: link, error: linkError } = await supabase
              .from('links')
              .select('original_url, password_hash, redirect_type, expires_at, status')
              .eq('short_code', shortCode)
              .single();

            if (linkError || !link) {
              setError('Link not found.');
              setLoading(false);
              return;
            }

            // Check if link is active (only if status is explicitly set to inactive)
            if (link.status && link.status !== 'active') {
              setError('Link is inactive.');
              setLoading(false);
              return;
            }

            if (link.expires_at && new Date(link.expires_at) < new Date()) {
              setError('Link has expired.');
              setLoading(false);
              return;
            }

            // If password protected, show password form (not implemented in this component yet)
            if (link.password_hash) {
              setError('This link is password protected.');
              setLoading(false);
              return;
            }

            // Redirect to the original URL
            window.location.href = link.original_url;
          } catch (fallbackError) {
            console.error('Fallback error:', fallbackError);
            setError('Unable to access link. Please try again.');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Redirect error:', err);
        setError('An unexpected error occurred.');
        setLoading(false);
      }
    };

    handleRedirect();
  }, [shortCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-center p-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <a href="/" className="text-primary hover:underline">Go to homepage</a>
        </div>
      </div>
    );
  }

  return null; // Should redirect before rendering anything else
};

export default Redirect;
