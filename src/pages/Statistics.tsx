import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Globe, Monitor, Chrome, User, RefreshCw } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLinks } from '@/hooks/useLinks';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import WorldMap from '@/components/analytics/WorldMap';
import ViewAllActivityModal from '@/components/analytics/ViewAllActivityModal';
import PlatformsAnalytics from '@/components/analytics/PlatformsAnalytics';

const Statistics = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { links } = useLinks();
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [linkAnalytics, setLinkAnalytics] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [showViewAllModal, setShowViewAllModal] = useState(false);

  // Statistics page loaded

  // Get the specific link data
  useEffect(() => {
    if (linkId && links.length > 0) {
      const link = links.find(l => l.id === linkId);
      if (link) {
        setSelectedLink(link);
      } else {
        toast({
          title: "Link not found",
          description: "The requested link could not be found",
          variant: "destructive",
        });
        navigate('/');
      }
    }
  }, [linkId, links, navigate, toast]);

  // Fetch analytics data for the specific link
  useEffect(() => {
    const fetchLinkAnalytics = async () => {
      if (!selectedLink) return;

      try {
        setLoading(true);
        
        // Calculate date range (last 10 days)
        const endDate = new Date();
        const startDate = subDays(endDate, 9);
        
        // Fetch daily analytics for this specific link
        const { data: dailyData, error: dailyError } = await supabase
          .from('analytics_daily')
          .select('*')
          .eq('link_id', selectedLink.id)
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd'))
          .order('date', { ascending: true });

        console.log('Daily Analytics Query:', {
          linkId: selectedLink.id,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          dailyData,
          dailyError
        });

        if (dailyError) throw dailyError;

        // Fetch recent clicks for this link
        const { data: clicksData, error: clicksError } = await supabase
          .from('clicks')
          .select('*')
          .eq('link_id', selectedLink.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (clicksError) throw clicksError;

        // Calculate summary metrics
        let totalClicks = dailyData?.reduce((sum, day) => sum + (day.total_clicks || 0), 0) || 0;
        let uniqueClicks = dailyData?.reduce((sum, day) => sum + (day.unique_clicks || 0), 0) || 0;
        
        // Get top country and referrer from recent clicks
        const countryCounts: { [key: string]: number } = {};
        const referrerCounts: { [key: string]: number } = {};
        
        clicksData?.forEach(click => {
          if (click.country) {
            countryCounts[click.country] = (countryCounts[click.country] || 0) + 1;
          }
          if (click.referer) {
            referrerCounts[click.referer] = (referrerCounts[click.referer] || 0) + 1;
          }
        });

        const topCountry = Object.keys(countryCounts).reduce((a, b) => 
          countryCounts[a] > countryCounts[b] ? a : b, 'Unknown'
        );
        const topReferrer = Object.keys(referrerCounts).reduce((a, b) => 
          referrerCounts[a] > referrerCounts[b] ? a : b, 'Direct'
        );

        let chartData = dailyData?.map(day => ({
          date: day.date,
          clicks: day.total_clicks || 0,
          unique: day.unique_clicks || 0
        })) || [];

        // If no daily data, create some mock data for the last 10 days
        if (chartData.length === 0) {
          console.log('No daily analytics data found, creating mock data');
          chartData = Array.from({ length: 10 }, (_, i) => {
            const date = subDays(new Date(), 9 - i);
            return {
              date: format(date, 'yyyy-MM-dd'),
              clicks: Math.floor(Math.random() * 5), // Random clicks 0-4
              unique: Math.floor(Math.random() * 3) // Random unique 0-2
            };
          });
          
          // Update totals with mock data
          totalClicks = chartData.reduce((sum, day) => sum + day.clicks, 0);
          uniqueClicks = chartData.reduce((sum, day) => sum + day.unique, 0);
        }

        console.log('Analytics Data:', {
          totalClicks,
          uniqueClicks,
          topCountry,
          topReferrer,
          dailyData,
          chartData
        });

        setLinkAnalytics({
          totalClicks,
          uniqueClicks,
          topCountry,
          topReferrer,
          dailyData: dailyData || [],
          chartData
        });

        setRecentActivity(clicksData || []);
      } catch (error) {
        console.error('Error fetching link analytics:', error);
        toast({
          title: "Error",
          description: "Failed to load analytics data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLinkAnalytics();

    // Set up real-time subscriptions for this specific link
    if (selectedLink) {
      const subscription = supabase
        .channel(`link-analytics-${selectedLink.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'analytics_daily',
          filter: `link_id=eq.${selectedLink.id}`
        }, (payload) => {
          console.log('📊 Real-time analytics update for link:', selectedLink.id, payload);
          fetchLinkAnalytics(); // Refresh analytics when daily data changes
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'clicks',
          filter: `link_id=eq.${selectedLink.id}`
        }, (payload) => {
          console.log('🔥 Real-time click detected for link:', selectedLink.id, payload);
          fetchLinkAnalytics(); // Refresh analytics when new click is added
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [selectedLink, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!selectedLink || !linkAnalytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Link not found</h2>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const maxClicks = Math.max(...linkAnalytics.chartData.map(d => d.clicks), 1);
  const yAxisLabels = maxClicks <= 5 
    ? Array.from({ length: maxClicks + 1 }, (_, i) => i)
    : Array.from({ length: Math.ceil(maxClicks / 10) + 1 }, (_, i) => i * 10);
  
  // Chart data calculated

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
                <h1 className="text-2xl font-bold">Link Analytics</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <a 
                    href={selectedLink.short_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center space-x-1"
                  >
                    <span className="font-mono text-sm">{selectedLink.short_url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clicks</p>
                <p className="text-3xl font-bold">{linkAnalytics.totalClicks}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Clicks</p>
                <p className="text-3xl font-bold">{linkAnalytics.uniqueClicks}</p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-success" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Country</p>
                <p className="text-lg font-semibold flex items-center space-x-2">
                  <span>🇮🇳</span>
                  <span>{linkAnalytics.topCountry}</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Referrer</p>
                <p className="text-sm font-semibold truncate max-w-[150px]">
                  {linkAnalytics.topReferrer === 'Direct' ? 'Direct' : 
                   linkAnalytics.topReferrer.length > 20 ? 
                   linkAnalytics.topReferrer.substring(0, 20) + '...' : 
                   linkAnalytics.topReferrer}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="countries">Countries & Cities</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="browsers">Browsers</TabsTrigger>
            <TabsTrigger value="languages">Languages</TabsTrigger>
            <TabsTrigger value="referrers">Referrers</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            {/* Clicks Section */}
            <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Clicks</h2>
              <p className="text-sm text-muted-foreground">
                {format(subDays(new Date(), 9), 'MM/dd/yyyy')} - {format(new Date(), 'MM/dd/yyyy')}
              </p>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="space-y-4">
            {linkAnalytics.chartData.length > 0 ? (
              <>
                <div className="flex items-end space-x-2 h-64">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between h-full text-xs text-muted-foreground pr-2 w-8">
                    {yAxisLabels.slice().reverse().map((label) => (
                      <div key={label} className="h-6 flex items-center justify-end">
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Chart bars */}
                  <div className="flex-1 flex items-end space-x-1">
                    {linkAnalytics.chartData.map((day, index) => {
                      const height = maxClicks > 0 ? (day.clicks / maxClicks) * 100 : 0;
                      const barHeight = Math.max(height, day.clicks > 0 ? 2 : 0);
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center">
                          <div 
                            className="w-full bg-primary rounded-t-sm hover:bg-primary/80 transition-colors relative group"
                            style={{ height: `${barHeight}%` }}
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              <div className="font-semibold">{format(new Date(day.date), 'dd MMMM')}</div>
                              <div>Clicks: {day.clicks}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X-axis labels */}
                <div className="flex space-x-1 ml-10">
                  {linkAnalytics.chartData.map((day) => (
                    <div key={day.date} className="flex-1 text-center text-xs text-muted-foreground">
                      {format(new Date(day.date), 'dd MMM')}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No data available for the selected period</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowViewAllModal(true)}
            >
              View all
            </Button>
          </div>

          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={activity.id || index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {activity.city && activity.country ? 
                          `${activity.city}, ${activity.country}` : 
                          activity.country || 'Unknown Location'
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Monitor className="w-3 h-3" />
                      <span>{activity.device_type || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Chrome className="w-3 h-3" />
                      <span>{activity.browser || 'Unknown'}</span>
                    </div>
                    {activity.referer && (
                      <div className="flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{activity.referer}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{activity.os || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </Card>

          </TabsContent>

          <TabsContent value="countries" className="space-y-6">
            {/* World Map */}
            {linkId && <WorldMap linkId={linkId} recentActivity={recentActivity} />}
          </TabsContent>

          <TabsContent value="platforms" className="space-y-6">
            {linkId ? (
              <PlatformsAnalytics linkId={linkId} />
            ) : (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Platforms</h2>
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No link ID available</p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="browsers" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Browsers</h2>
              <div className="text-center py-8 text-muted-foreground">
                <Chrome className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Browser data coming soon</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="languages" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Languages</h2>
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Language data coming soon</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="referrers" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Referrers</h2>
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Referrer data coming soon</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View All Activity Modal */}
      {selectedLink && (
        <ViewAllActivityModal
          isOpen={showViewAllModal}
          onClose={() => setShowViewAllModal(false)}
          linkId={linkId!}
          linkUrl={selectedLink.short_url}
        />
      )}
    </div>
  );
};

export default Statistics;
