import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('Starting login process...');

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('Login timeout - forcing loading to false');
      setLoading(false);
      toast({
        title: "Login timeout",
        description: "Login is taking too long. Please try again.",
        variant: "destructive",
      });
    }, 10000); // 10 second timeout

    try {
      console.log('Attempting login with:', email);
      
      // Test Supabase connection first
      console.log('Testing Supabase connection...');
      try {
        const { data: testData, error: testError } = await supabase.from('links').select('count').limit(1);
        console.log('Supabase connection test:', { testData, testError });
      } catch (connectionError) {
        console.error('Supabase connection failed:', connectionError);
        throw new Error('Cannot connect to Supabase. Please check your internet connection.');
      }
      
      // Try authentication with timeout
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout')), 8000)
      );
      
      const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any;

      console.log('Login response:', { data, error });

      if (error) {
        console.error('Login error:', error);
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('Login successful:', data);
        toast({
          title: "Welcome back!",
          description: "You've been logged in successfully.",
        });
        onSuccess?.();
      }
    } catch (error) {
      console.error('Login exception:', error);
      toast({
        title: "Login failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      clearTimeout(timeoutId);
      console.log('Login process finished, setting loading to false');
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-primary hover:underline"
            >
              Sign up
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
