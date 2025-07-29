import Navbar from "@/components/layout/Navbar";
import TrafficOverview from "@/components/dashboard/TrafficOverview";
import LinkShortener from "@/components/dashboard/LinkShortener";
import RecentActivity from "@/components/dashboard/RecentActivity";

const Index = () => {
  return (
    <div className="min-h-screen surface-gradient">
      <Navbar />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Traffic Overview Section */}
          <section>
            <TrafficOverview />
          </section>

          {/* Main Content Grid */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Link Management */}
            <div className="xl:col-span-2">
              <LinkShortener />
            </div>

            {/* Right Column - Recent Activity */}
            <div className="xl:col-span-1">
              <RecentActivity />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
