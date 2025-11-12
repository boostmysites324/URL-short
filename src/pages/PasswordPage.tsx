import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Lock } from "lucide-react";

const PasswordPage = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for error in URL params (from Edge Function redirect)
  useEffect(() => {
    if (searchParams.get('error') === 'invalid') {
      setError('Invalid password. Please try again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Call the track-click Edge Function with password
      const response = await fetch(
        `https://ozkuefljvpzpmbrkknfw.supabase.co/functions/v1/track-click`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': navigator.userAgent,
            'Referer': window.location.href,
            'Accept-Language': navigator.language || 'en-US',
          },
          body: JSON.stringify({
            code: shortCode,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success && data.url) {
        // Password correct - redirect to destination
        window.location.replace(data.url);
        return;
      }

      // If we reach here, password was incorrect
      setError('Invalid password. Please try again.');
    } catch (err) {
      console.error('Password submission error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="p-3 bg-blue-100 rounded-full">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Password Protected Link</h1>
        <p className="text-gray-600 text-center mb-6">
          This link requires a password to access
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Enter password"
              className="mt-1"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !password.trim()}
          >
            {isSubmitting ? 'Verifying...' : 'Access Link'}
          </Button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Shortened with <span className="font-semibold">247l.ink</span>
        </p>
      </div>
    </div>
  );
};

export default PasswordPage;

