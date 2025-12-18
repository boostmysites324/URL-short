import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When user clicks the email link, we need to extract the access_token from the hash
    // and exchange it for a session before we can update the password.
    const init = async () => {
      try {
        // Check if we have the access_token in the URL hash
        if (location.hash) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');
          
          if (accessToken && type === 'recovery') {
            // Exchange the token for a session
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (error) {
              console.error('Session error:', error);
              setError(error.message);
              toast({
                title: "Invalid or expired link",
                description: error.message || "Please request a new password reset email.",
                variant: "destructive",
              });
              // Don't navigate immediately, let user see the error
              return;
            }
            
            // Clear the hash from URL
            window.history.replaceState(null, '', '/reset-password');
            setReady(true);
            return;
          }
        }
        
        // If no hash, check if we already have a valid session
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setError("No valid session found. Please request a new password reset email.");
          toast({
            title: "Invalid or expired link",
            description: "Please request a new password reset email.",
            variant: "destructive",
          });
          setTimeout(() => navigate("/auth", { replace: true }), 3000);
          return;
        }
        
        setReady(true);
      } catch (err: any) {
        console.error('Error initializing reset password:', err);
        setError(err?.message || "An error occurred. Please try again.");
        toast({
          title: "Error",
          description: err?.message || "An error occurred. Please try again.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/auth", { replace: true }), 3000);
      }
    };
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({
          title: "Reset failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // After changing password, send user back to login cleanly.
      await supabase.auth.signOut();
      toast({
        title: "Password updated",
        description: "Please sign in with your new password.",
      });
      navigate("/auth", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Setting up password reset</CardTitle>
            <CardDescription>Please wait while we verify your reset link...</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            {error ? (
              <div className="text-center space-y-4">
                <p className="text-destructive font-medium">{error}</p>
                <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
              </div>
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Set new password</CardTitle>
          <CardDescription>Enter and confirm your new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


