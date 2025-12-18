import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import TrafficOverview from "@/components/dashboard/TrafficOverview";
import LinkShortener from "@/components/dashboard/LinkShortener";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if this is a password reset link (has access_token and type=recovery in hash)
    // Supabase redirects to Site URL when redirect_to doesn't match, so we catch it here
    if (location.hash) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (accessToken && type === 'recovery') {
        console.log('Index: Detected recovery link, redirecting to /reset-password');
        // Use window.location.replace for immediate, forceful redirect (can't go back)
        window.location.replace('/reset-password' + location.hash);
        return;
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen surface-gradient">
      <Navbar />
      
      <main className="mx-auto w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-4 sm:py-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Traffic Overview Section */}
          <section>
            <TrafficOverview />
          </section>

          {/* Main Content Grid */}
          <section>
            <LinkShortener />
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
