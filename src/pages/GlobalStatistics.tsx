import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Globe, Monitor, Chrome, User, RefreshCw, TrendingUp, MousePointer, Users } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLinks } from '@/hooks/useLinks';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import WorldMap from '@/components/analytics/WorldMap';
import ViewAllActivityModal from '@/components/analytics/ViewAllActivityModal';
import PlatformsAnalytics from '@/components/analytics/PlatformsAnalytics';
import BrowserAnalytics from '@/components/analytics/BrowserAnalytics';

const GlobalStatistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { links } = useLinks();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [globalAnalytics, setGlobalAnalytics] = useState({
    totalClicks: 0,
    uniqueClicks: 0,
    todayClicks: 0,
    chartData: [] as any[],
    recentActivity: [] as any[]
  });
  const [showAllActivity, setShowAllActivity] = useState(false);

  // Get current month date range
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { analytics, recentActivity } = useAnalytics(startDate, endDate);

  useEffect(() => {
    fetchGlobalAnalytics();
  }, []);

  const fetchGlobalAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all clicks for user's links
      const { data: allClicksData, error: clicksError } = await supabase
        .from('clicks')
        .select(`
          id,
          ip_address,
          clicked_at,
          country,
          country_name,
          city,
          device_type,
          browser,
          os,
          referer,
          links!inner(
            user_id,
            short_code,
            original_url
          )
        `)
        .eq('links.user_id', user.id)
        .order('clicked_at', { ascending: false });

      if (clicksError) throw clicksError;

      // Calculate total clicks
      const totalClicks = allClicksData?.length || 0;
      
      // Calculate unique clicks based on IP address
      const uniqueIPs = new Set(allClicksData?.map(click => click.ip_address).filter(Boolean) || []);
      const uniqueClicks = uniqueIPs.size;

      // Calculate today's clicks
      const today = new Date().toISOString().split('T')[0];
      const todayClicks = allClicksData?.filter(click => 
        click.clicked_at.startsWith(today)
      ).length || 0;

      // Create chart data for last 30 days
      const chartData = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const dayClicks = allClicksData?.filter(click => 
          click.clicked_at.startsWith(dateStr)
        ) || [];
        
        const dayUniqueIPs = new Set(dayClicks.map(click => click.ip_address).filter(Boolean));
        
        return {
          date: dateStr,
          clicks: dayClicks.length,
          unique: dayUniqueIPs.size
        };
      });

      // Get recent activity (last 20 clicks)
      const recentActivityData = allClicksData?.slice(0, 20).map(click => ({
        id: click.id,
        original_url: click.links?.original_url || 'Unknown',
        short_url: `http://localhost:8080/s/${click.links?.short_code}`,
        city: click.city || 'Unknown',
        country: click.country || 'Unknown',
        country_name: click.country_name || 'Unknown',
        device_type: click.device_type || 'unknown',
        browser_type: click.browser || 'Unknown',
        os_type: click.os || 'Unknown',
        clicked_at: click.clicked_at,
        todayClicks: 0,
        yesterdayClicks: 0
      })) || [];

      setGlobalAnalytics({
        totalClicks,
        uniqueClicks,
        todayClicks,
        chartData,
        recentActivity: recentActivityData
      });

      console.log('Global Analytics Data:', {
        totalClicks,
        uniqueClicks,
        todayClicks,
        chartDataLength: chartData.length,
        recentActivityLength: recentActivityData.length
      });

    } catch (error) {
      console.error('Error fetching global analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch global analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const maxClicks = Math.max(...globalAnalytics.chartData.map(d => d.clicks), 1);
  const getYAxisLabels = (max: number) => {
    if (max <= 10) {
      return Array.from({ length: max + 1 }, (_, i) => i);
    } else if (max <= 50) {
      const step = Math.ceil(max / 5);
      return Array.from({ length: 6 }, (_, i) => i * step);
    } else {
      const step = Math.ceil(max / 5);
      return Array.from({ length: 6 }, (_, i) => i * step);
    }
  };
  const yAxisLabels = getYAxisLabels(maxClicks);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Global Statistics</h1>
                <p className="text-muted-foreground">Analytics for all your links combined</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{globalAnalytics.totalClicks}</p>
              </div>
              <MousePointer className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Clicks</p>
                <p className="text-2xl font-bold">{globalAnalytics.uniqueClicks}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Clicks</p>
                <p className="text-2xl font-bold">{globalAnalytics.todayClicks}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Links</p>
                <p className="text-2xl font-bold">{links.length}</p>
              </div>
              <ExternalLink className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="countries">Countries & Cities</TabsTrigger>
            {/* <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="browsers">Browsers</TabsTrigger> */}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Daily Clicks Chart */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Daily Clicks (Last 30 Days)</h2>
                  <p className="text-sm text-muted-foreground">Combined clicks from all your links</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchGlobalAnalytics}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              <div className="relative bg-surface-secondary/30 rounded-lg p-4">
                <div className="flex items-end justify-between h-72 space-x-1">
                  {globalAnalytics.chartData.map((data, index) => {
                    const maxYAxis = Math.max(...yAxisLabels);
                    const height = (data.clicks / maxYAxis) * 100;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center group relative">
                        <div 
                          className="w-full bg-gradient-to-t from-primary to-primary-light hover:from-primary-dark hover:to-primary rounded-t-lg relative cursor-pointer chart-bar shadow-md"
                          style={{ 
                            height: `${height}%`,
                            minHeight: '8px'
                          }}
                        >
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-card border border-card-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 animate-scale-in min-w-48">
                            <div className="text-sm font-semibold text-card-foreground mb-2">{data.date}</div>
                            <div className="text-sm text-primary font-medium mb-2">{data.clicks} total clicks</div>
                            <div className="text-xs text-muted-foreground">{data.unique} unique clicks</div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 transform -rotate-45 origin-left">
                          {format(new Date(data.date), 'MMM dd')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Recent Activity</h2>
                  <p className="text-sm text-muted-foreground">Latest clicks from all your links</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAllActivity(true)}
                >
                  View All
                </Button>
              </div>
              
              <div className="space-y-3">
                {globalAnalytics.recentActivity.slice(0, 10).map((activity, index) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.original_url}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.city}, {activity.country_name} • {activity.device_type} • {format(new Date(activity.clicked_at), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {activity.browser_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="countries" className="space-y-6">
            <WorldMap 
              linkId={null} 
              recentActivity={globalAnalytics.recentActivity}
              onCountrySelect={() => {}}
            />
          </TabsContent>

          {/* <TabsContent value="platforms" className="space-y-6">
            <PlatformsAnalytics linkId={null} />
          </TabsContent>

          <TabsContent value="browsers" className="space-y-6">
            <BrowserAnalytics linkId={null} />
          </TabsContent> */}
        </Tabs>
      </div>

      {/* View All Activity Modal */}
      {showAllActivity && (
        <ViewAllActivityModal
          isOpen={showAllActivity}
          onClose={() => setShowAllActivity(false)}
          linkId={null}
          linkUrl="All Links"
        />
      )}
    </div>
  );
};

export default GlobalStatistics;
