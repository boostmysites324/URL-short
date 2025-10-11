import Navbar from "@/components/layout/Navbar";
import TrafficOverview from "@/components/dashboard/TrafficOverview";
import LinkShortener from "@/components/dashboard/LinkShortener";

const Index = () => {
  return (
    <div className="min-h-screen surface-gradient">
      <Navbar />
      
      <main className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
        <div className="space-y-6">
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
