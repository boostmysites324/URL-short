import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Redirect = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
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
          
          // Check for 401 error (password required) first
          if (trackResult.error && 
              (trackResult.error.message?.includes('non-2xx status code') || 
               trackResult.error.message?.includes('401'))) {
            console.log('🔒 Password required for this link');
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
        } catch (trackError: any) {
          console.error('Error with track-click function:', trackError);
          
          // Check if it's a 401 error (password required)
          if (trackError?.status === 401 || 
              trackError?.response?.status === 401 || 
              trackError?.message?.includes('401') ||
              trackError?.message?.includes('non-2xx status code')) {
            console.log('🔒 Password required for this link');
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
