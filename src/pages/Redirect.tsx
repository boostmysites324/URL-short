import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Redirect = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [loading, setLoading] = useState<boolean | null>(null); // null = not started, true = loading, false = done
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const hasProcessedRef = useRef(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    const handleRedirect = async () => {
      // Prevent double execution
      if (hasProcessedRef.current || redirectingRef.current) {
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
            setLoading(false);
            return;
          }

          // The track-click function returns JSON with redirect info
          if (trackResult.data) {
            if (trackResult.data.requiresPassword) {
              // Link requires password
              setRequiresPassword(true);
              setLoading(false);
            } else if (trackResult.data.redirect && trackResult.data.url) {
              // INSTANT redirect using meta refresh for zero-delay redirect
              redirectingRef.current = true;
              // Inject meta refresh tag immediately
              const meta = document.createElement('meta');
              meta.httpEquiv = 'refresh';
              meta.content = `0;url=${trackResult.data.url}`;
              document.head.appendChild(meta);
              // Also use location.replace as backup
              window.location.replace(trackResult.data.url);
              return;
            } else {
              setError('Unexpected response from server.');
              setLoading(false);
            }
          } else {
            setError('No data received from server.');
            setLoading(false);
          }
        } catch (trackError: any) {
          // Check if it's a 401 error (password required)
          if (trackError?.status === 401 || 
              trackError?.response?.status === 401 || 
              trackError?.message?.includes('401') ||
              trackError?.message?.includes('non-2xx status code')) {
            setRequiresPassword(true);
            setLoading(false);
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

            // If password protected, show password form
            if (link.password_hash) {
              setRequiresPassword(true);
              setLoading(false);
              return;
            }

            // INSTANT redirect using meta refresh for zero-delay redirect
            redirectingRef.current = true;
            // Inject meta refresh tag immediately
            const meta = document.createElement('meta');
            meta.httpEquiv = 'refresh';
            meta.content = `0;url=${link.original_url}`;
            document.head.appendChild(meta);
            // Also use location.replace as backup
            window.location.replace(link.original_url);
            return;
          } catch (fallbackError) {
            setError('Unable to access link. Please try again.');
            setLoading(false);
          }
        }
      } catch (err) {
        setError('An unexpected error occurred.');
        setLoading(false);
      }
    };

    handleRedirect();
  }, [shortCode]);

  // If we're redirecting, don't render anything
  if (redirectingRef.current) {
    return null;
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setLoading(true);

    try {
      console.log('🚀 REDIRECT: Submitting password for short code:', shortCode);
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
          console.log('Password correct, redirecting to:', trackResult.data.url);
          window.location.href = trackResult.data.url;
        } else if (trackResult.data.error) {
          setPasswordError(trackResult.data.error);
          setLoading(false);
        }
      } else {
        setPasswordError('Invalid response from server.');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Password submission error:', error);
      
      // Check if it's still a 401 error (wrong password)
      if (error?.status === 401 || 
          error?.response?.status === 401 || 
          error?.message?.includes('401') ||
          error?.message?.includes('non-2xx status code')) {
        setPasswordError('Invalid password. Please try again.');
      } else {
        setPasswordError('Failed to verify password. Please try again.');
      }
      setLoading(false);
    }
  };

  // Don't show loading screen - only show if we need password or have error
  // For normal redirects, we redirect immediately without rendering
  if (loading === null || loading === true) {
    // Only show loading if we're waiting for password check
    // For normal redirects, we should have redirected already
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
                  disabled={loading}
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Continue'
                )}
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
