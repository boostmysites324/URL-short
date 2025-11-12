import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Redirect = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  // Immediate redirect effect - runs synchronously BEFORE paint to prevent white screen
  useLayoutEffect(() => {
    if (redirectUrl) {
      // Inject redirect script immediately in head for instant redirect
      const script = document.createElement('script');
      script.textContent = `window.location.replace("${redirectUrl}");`;
      document.head.appendChild(script);
      
      // Also use location.replace as backup
      window.location.replace(redirectUrl);
      return;
    }
  }, [redirectUrl]);

  useEffect(() => {
    const handleRedirect = async () => {
      // Prevent double execution
      if (hasProcessedRef.current) {
        return;
      }
      hasProcessedRef.current = true;
      
      if (!shortCode) {
        setError('Short code is missing.');
        return;
      }

      try {
        // Use the track-click function to handle everything (link lookup, validation, tracking, redirect)
        try {
          const trackResult = await supabase.functions.invoke('track-click', {
            body: { code: shortCode },
            headers: {
              'user-agent': navigator.userAgent,
              'referer': document.referrer,
              'accept-language': navigator.language,
            }
          });
          
          // Check for 401 error (password required) first
          if (trackResult.error && 
              (trackResult.error.message?.includes('non-2xx status code') || 
               trackResult.error.message?.includes('401'))) {
            setRequiresPassword(true);
            return;
          }

          // The track-click function returns JSON with redirect info
          if (trackResult.data) {
            if (trackResult.data.requiresPassword) {
              // Link requires password
              setRequiresPassword(true);
            } else if (trackResult.data.redirect && trackResult.data.url) {
              // Set redirect URL - this will trigger immediate redirect via useEffect
              setRedirectUrl(trackResult.data.url);
              return;
            } else {
              setError('Unexpected response from server.');
            }
          } else {
            setError('No data received from server.');
          }
        } catch (trackError: any) {
          // Check if it's a 401 error (password required)
          if (trackError?.status === 401 || 
              trackError?.response?.status === 401 || 
              trackError?.message?.includes('401') ||
              trackError?.message?.includes('non-2xx status code')) {
            setRequiresPassword(true);
            return;
          }
          
          // Fallback: try to get the link directly (this might fail due to RLS)
          try {
            const { data: link, error: linkError } = await supabase
              .from('links')
              .select('original_url, password_hash, redirect_type, expires_at, status')
              .eq('short_code', shortCode)
              .single();

            if (linkError || !link) {
              setError('Link not found.');
              return;
            }

            // Type guard - ensure link has required properties
            const linkData = link as { original_url?: string; status?: string; expires_at?: string; password_hash?: string };
            
            if (!linkData.original_url) {
              setError('Link not found.');
              return;
            }

            // Check if link is active (only if status is explicitly set to inactive)
            if (linkData.status && linkData.status !== 'active') {
              setError('Link is inactive.');
              return;
            }

            if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
              setError('Link has expired.');
              return;
            }

            // If password protected, show password form
            if (linkData.password_hash) {
              setRequiresPassword(true);
              return;
            }

            // Set redirect URL - this will trigger immediate redirect via useEffect
            setRedirectUrl(linkData.original_url);
            return;
          } catch (fallbackError) {
            setError('Unable to access link. Please try again.');
          }
        }
      } catch (err) {
        setError('An unexpected error occurred.');
      }
    };

    handleRedirect();
  }, [shortCode]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    try {
      const trackResult = await supabase.functions.invoke('track-click', {
        body: { code: shortCode, password: password },
        headers: {
          'user-agent': navigator.userAgent,
          'referer': document.referrer,
          'accept-language': navigator.language,
        }
      });

      if (trackResult.data) {
        if (trackResult.data.redirect && trackResult.data.url) {
          setRedirectUrl(trackResult.data.url);
        } else if (trackResult.data.error) {
          setPasswordError(trackResult.data.error);
        }
      } else {
        setPasswordError('Invalid response from server.');
      }
    } catch (error: any) {
      // Check if it's still a 401 error (wrong password)
      if (error?.status === 401 || 
          error?.response?.status === 401 || 
          error?.message?.includes('401') ||
          error?.message?.includes('non-2xx status code')) {
        setPasswordError('Invalid password. Please try again.');
      } else {
        setPasswordError('Failed to verify password. Please try again.');
      }
    }
  };

  // If we have a redirect URL, return nothing - redirect happens via useEffect
  // This prevents any white screen from showing
  if (redirectUrl) {
    return null;
  }

  // While loading (before we know if we need password or error), return nothing
  // This prevents white screen during API call
  if (!error && !requiresPassword && !redirectUrl) {
    return null;
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Password Protected Link</CardTitle>
            <CardDescription>
              This link is password protected. Please enter the password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
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
