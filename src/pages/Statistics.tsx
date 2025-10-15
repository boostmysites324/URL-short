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
import { format, subDays, startOfDay, endOfDay, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import WorldMap from '@/components/analytics/WorldMap';
import ViewAllActivityModal from '@/components/analytics/ViewAllActivityModal';
import PlatformsAnalytics from '@/components/analytics/PlatformsAnalytics';
import BrowserAnalytics from '@/components/analytics/BrowserAnalytics';

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
  const [allLinkClicks, setAllLinkClicks] = useState<any[]>([]);

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

        // Calculate summary metrics from actual clicks table (not analytics_daily)
        const { data: allClicksData, error: allClicksError } = await supabase
          .from('clicks')
          .select('id, ip_address, created_at')
          .eq('link_id', selectedLink.id);

        if (allClicksError) throw allClicksError;

        // Calculate total clicks from actual clicks table
        let totalClicks = allClicksData?.length || 0;
        
        // Calculate unique clicks based on IP address
        const uniqueIPs = new Set(allClicksData?.map(click => click.ip_address).filter(Boolean) || []);
        let uniqueClicks = uniqueIPs.size;

        console.log('Statistics - Click counts from actual clicks table:', {
          totalClicks,
          uniqueClicks,
          allClicksCount: allClicksData?.length || 0,
          uniqueIPsCount: uniqueIPs.size
        });
        
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

        // Create chart data from actual clicks (last 10 days)
        const chartData = Array.from({ length: 10 }, (_, i) => {
          const date = subDays(new Date(), 9 - i);
          const dateStr = format(date, 'yyyy-MM-dd');
          
          // Count clicks for this specific date
          const dayClicks = allClicksData?.filter(click => 
            click.created_at.startsWith(dateStr)
          ) || [];
          
          // Count unique clicks for this date
          const dayUniqueIPs = new Set(dayClicks.map(click => click.ip_address).filter(Boolean));
          
          return {
            date: dateStr,
            clicks: dayClicks.length,
            unique: dayUniqueIPs.size
          };
        });

        console.log('Statistics - Chart data from actual clicks:', {
          chartData,
          totalClicks,
          uniqueClicks
        });

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
        setAllLinkClicks(allClicksData || []);
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

  // Build last 12 months chart data from all clicks
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), 11 - i);
    return { key: format(d, 'yyyy-MM'), label: format(d, 'LLLL') };
  });
  const monthlyChartData = last12Months.map((m) => {
    const count = allLinkClicks.filter((c: any) => (c.created_at || '').startsWith(m.key)).length;
    return { date: m.label, clicks: count };
  });
  const maxClicks = Math.max(...monthlyChartData.map(d => d.clicks), 0);
  const roundedMax = Math.max(200, Math.ceil(maxClicks / 200) * 200);
  const yAxisLabels = Array.from({ length: roundedMax / 200 + 1 }, (_, i) => i * 200);
  
  // Chart data calculated

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Button variant="ghost" onClick={() => navigate('/')} className="flex-shrink-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold truncate">Link Analytics</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <a 
                    href={selectedLink.short_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center space-x-1 min-w-0"
                  >
                    <span className="font-mono text-xs sm:text-sm truncate">{selectedLink.short_url}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Clicks</p>
                <p className="text-xl sm:text-3xl font-bold">{linkAnalytics.totalClicks}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <RefreshCw className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Unique Clicks</p>
                <p className="text-xl sm:text-3xl font-bold">{linkAnalytics.uniqueClicks}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-success/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 sm:w-6 sm:h-6 text-success" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Top Country</p>
                <p className="text-sm sm:text-lg font-semibold flex items-center space-x-1 sm:space-x-2">
                  <span className="text-lg sm:text-xl">🇮🇳</span>
                  <span className="truncate">{linkAnalytics.topCountry}</span>
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Top Referrer</p>
                <p className="text-xs sm:text-sm font-semibold truncate max-w-[120px] sm:max-w-[150px]">
                  {linkAnalytics.topReferrer === 'Direct' ? 'Direct' : 
                   linkAnalytics.topReferrer.length > 15 ? 
                   linkAnalytics.topReferrer.substring(0, 15) + '...' : 
                   linkAnalytics.topReferrer}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Globe className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main content grid (no tabs) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Clicks Section - Monthly chart and export */}
            <Card className="p-4 sm:p-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Clicks</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Last 12 months</p>
            </div>
            <Button 
              onClick={async () => {
                try {
                  const { data: clicksData, error } = await supabase
                    .from('clicks')
                    .select('*')
                    .eq('link_id', selectedLink.id)
                    .order('created_at', { ascending: false });
                  if (error) throw error;
                  if (!clicksData || clicksData.length === 0) return;
                  const headers = ['Date','Time','Country','City','Region','IP Address','Device Type','Browser','Operating System','User Agent','Referrer','Is Unique Click'];
                  const rows = clicksData.map((c: any) => [
                    new Date(c.created_at).toLocaleDateString(),
                    new Date(c.created_at).toLocaleTimeString(),
                    c.country_name || c.country || 'Unknown',
                    c.city || 'Unknown',
                    c.region || 'Unknown',
                    c.ip_address || 'Unknown',
                    c.device_type || 'Unknown',
                    c.browser || 'Unknown',
                    c.os || 'Unknown',
                    c.user_agent || 'Unknown',
                    c.referer || 'Direct',
                    c.is_unique ? 'Yes' : 'No',
                  ]);
                  const csv = [headers.join(','), ...rows.map(r => r.map(f => `"${String(f).replace(/"/g,'""')}"`).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `statistics_${selectedLink.short_code}_${new Date().toISOString().slice(0,10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  console.error('Export error', e);
                }
              }}
              className="w-full sm:w-auto"
            >
              <span className="text-sm">Export Stats</span>
            </Button>
          </div>

          {/* Monthly Bar Chart */}
          <div className="space-y-3 sm:space-y-4">
            {monthlyChartData.length > 0 ? (
              <div className="relative bg-white rounded-lg p-3 sm:p-4 border border-card-border">
                {/* Y axis labels */}
                <div className="absolute left-1 sm:left-2 top-4 sm:top-6 bottom-8 sm:bottom-10 flex flex-col justify-between text-xs text-muted-foreground select-none">
                  {yAxisLabels.slice().reverse().map((label) => (
                    <span key={`yl-${label}`}>{label}</span>
                  ))}
                </div>
                {/* Y axis line */}
                <div className="absolute left-8 sm:left-12 top-4 sm:top-6 bottom-8 sm:bottom-10 w-px bg-gray-200" />

                <div className="flex items-end h-48 sm:h-72 space-x-1 sm:space-x-2 pl-8 sm:pl-12 pr-1 sm:pr-2">
                  {/* Bars */}
                  <div className="flex-1 flex items-end space-x-1 sm:space-x-2">
                    {monthlyChartData.map((m) => {
                      const height = roundedMax > 0 ? (m.clicks / roundedMax) * 100 : 0;
                      const barHeight = Math.max(height, m.clicks > 0 ? 2 : 0);
                      return (
                        <div key={m.date} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-rose-300 border border-rose-500 sm:border-2 rounded-t-lg"
                            style={{ height: `${barHeight}%`, minHeight: '4px' }}
                          />
                          <div className="text-xs text-muted-foreground mt-1 sm:mt-2 text-center">{m.date}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No data available</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-4 sm:p-6 lg:col-span-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3 sm:gap-0">
            <h2 className="text-lg sm:text-xl font-semibold">Recent Activity</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowViewAllModal(true)}
              className="w-full sm:w-auto"
            >
              <span className="text-sm">View all</span>
            </Button>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={activity.id || index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/50 rounded-lg gap-2 sm:gap-0">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {activity.city && activity.country ? 
                          `${activity.city}, ${activity.country}` : 
                          activity.country || 'Unknown Location'
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Monitor className="w-3 h-3" />
                      <span className="hidden sm:inline">{activity.device_type || 'Unknown'}</span>
                      <span className="sm:hidden">{(activity.device_type || 'Unknown').substring(0, 3)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Chrome className="w-3 h-3" />
                      <span className="hidden sm:inline">{activity.browser || 'Unknown'}</span>
                      <span className="sm:hidden">{(activity.browser || 'Unknown').substring(0, 3)}</span>
                    </div>
                    {activity.referer && (
                      <div className="flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span className="truncate max-w-[80px] sm:max-w-[100px] text-xs">{activity.referer}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span className="hidden sm:inline">{activity.os || 'Unknown'}</span>
                      <span className="sm:hidden">{(activity.os || 'Unknown').substring(0, 3)}</span>
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
        </div>
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
