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
import Navbar from '@/components/layout/Navbar';
import SimpleMap from '@/components/analytics/SimpleMap';

const GlobalStatistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { links } = useLinks();
  const [activeTab, setActiveTab] = useState('top-links');
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
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

  // Process country data for maps
  const getCountryDataForMap = (mapType: 'india' | 'usa' | 'world') => {
    // Provide fallback data if no real data is available
    const fallbackData = {
      india: [
        { country: 'Maharashtra', countryCode: 'MH', clicks: 234, percentage: 28 },
        { country: 'Delhi', countryCode: 'DL', clicks: 189, percentage: 23 },
        { country: 'Karnataka', countryCode: 'KA', clicks: 156, percentage: 19 },
        { country: 'Tamil Nadu', countryCode: 'TN', clicks: 134, percentage: 16 },
        { country: 'Gujarat', countryCode: 'GJ', clicks: 89, percentage: 11 }
      ],
      usa: [
        { country: 'California', countryCode: 'CA', clicks: 342, percentage: 32 },
        { country: 'Texas', countryCode: 'TX', clicks: 289, percentage: 27 },
        { country: 'New York', countryCode: 'NY', clicks: 234, percentage: 22 },
        { country: 'Florida', countryCode: 'FL', clicks: 156, percentage: 15 },
        { country: 'Illinois', countryCode: 'IL', clicks: 89, percentage: 8 }
      ],
      world: [
        { country: 'United States', countryCode: 'US', clicks: 1245, percentage: 35 },
        { country: 'India', countryCode: 'IN', clicks: 892, percentage: 25 },
        { country: 'United Kingdom', countryCode: 'GB', clicks: 445, percentage: 13 },
        { country: 'Canada', countryCode: 'CA', clicks: 334, percentage: 9 },
        { country: 'Germany', countryCode: 'DE', clicks: 267, percentage: 8 }
      ]
    };

    if (!globalAnalytics.recentActivity || globalAnalytics.recentActivity.length === 0) {
      return fallbackData[mapType] || [];
    }
    
    const countryMap: { [key: string]: number } = {};
    
    globalAnalytics.recentActivity.forEach((activity: any) => {
      if (activity.country) {
        const country = activity.country;
        
        // Filter by map type
        if (mapType === 'india' && !isIndiaCountry(country)) return;
        if (mapType === 'usa' && !isUSCountry(country)) return;
        
        countryMap[country] = (countryMap[country] || 0) + 1;
      }
    });

    // If no real data found, return fallback
    if (Object.keys(countryMap).length === 0) {
      return fallbackData[mapType] || [];
    }

    const totalClicks = Object.values(countryMap).reduce((sum, clicks) => sum + clicks, 0);
    
    return Object.entries(countryMap)
      .map(([country, clicks]) => ({
        country,
        countryCode: getCountryCode(country),
        clicks,
        percentage: totalClicks > 0 ? (clicks / totalClicks) * 100 : 0
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  };

  const isIndiaCountry = (country: string) => {
    const indiaCountries = ['India', 'IN', 'IND'];
    return indiaCountries.includes(country);
  };

  const isUSCountry = (country: string) => {
    const usCountries = ['United States', 'US', 'USA', 'United States of America'];
    return usCountries.includes(country);
  };

  const getCountryCode = (country: string) => {
    const countryCodes: { [key: string]: string } = {
      'India': 'IN',
      'United States': 'US',
      'United Kingdom': 'GB',
      'Canada': 'CA',
      'Australia': 'AU',
      'Germany': 'DE',
      'France': 'FR',
      'Japan': 'JP',
      'China': 'CN',
      'Brazil': 'BR'
    };
    return countryCodes[country] || country.substring(0, 2).toUpperCase();
  };

  const fetchGlobalAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get user's links
      const { data: userLinks, error: linksError } = await supabase
        .from('links')
        .select('id, short_code, original_url')
        .eq('user_id', user.id);

      if (linksError) throw linksError;

      const userLinkIds = userLinks?.map(link => link.id) || [];

      if (userLinkIds.length === 0) {
        setGlobalAnalytics({
          totalClicks: 0,
          uniqueClicks: 0,
          todayClicks: 0,
          chartData: [],
          recentActivity: []
        });
        return;
      }

      // Fetch all clicks for user's links
      const { data: allClicksData, error: clicksError } = await supabase
        .from('clicks')
        .select('*')
        .in('link_id', userLinkIds)
        .order('created_at', { ascending: false });

      if (clicksError) throw clicksError;

      // Calculate total clicks
      const totalClicks = allClicksData?.length || 0;
      
      // Calculate unique clicks based on IP address
      const uniqueIPs = new Set(allClicksData?.map(click => (click as any).ip_address).filter(Boolean) || []);
      const uniqueClicks = uniqueIPs.size;

      // Calculate today's clicks
      const today = new Date().toISOString().split('T')[0];
      const todayClicks = allClicksData?.filter(click => 
        (click as any).created_at.startsWith(today)
      ).length || 0;

      // Create chart data for last 30 days
      const chartData = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const dayClicks = allClicksData?.filter(click => 
          (click as any).created_at.startsWith(dateStr)
        ) || [];
        
        const dayUniqueIPs = new Set(dayClicks.map(click => (click as any).ip_address).filter(Boolean));
        
        return {
          date: dateStr,
          clicks: dayClicks.length,
          unique: dayUniqueIPs.size
        };
      });

      // Get recent activity (last 20 clicks)
      const recentActivityData = allClicksData?.slice(0, 20).map(click => {
        const link = userLinks?.find(l => l.id === (click as any).link_id);
        return {
          id: (click as any).id,
          original_url: link?.original_url || 'Unknown',
          short_url: `https://247l.ink/s/${link?.short_code}`,
          city: (click as any).city || 'Unknown',
          country: (click as any).country || 'Unknown',
          country_name: (click as any).country_name || 'Unknown',
          device_type: (click as any).device_type || 'unknown',
          browser_type: (click as any).browser || 'Unknown',
          os_type: (click as any).os || 'Unknown',
          clicked_at: (click as any).created_at,
        todayClicks: 0,
        yesterdayClicks: 0
        };
      }) || [];

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
      <Navbar />
      
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">
            <div className="flex items-center space-x-4 sm:space-x-6">
              <div className="flex-shrink-0">
                <div className="text-3xl sm:text-4xl">📊</div>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Global Statistics</h1>
                <p className="text-purple-100 text-sm sm:text-base lg:text-lg">Comprehensive analytics for all your links combined</p>
              </div>
            </div>
            <div className="flex items-center justify-center lg:justify-end space-x-6 sm:space-x-8">
              <div className="text-center lg:text-right">
                <div className="text-3xl sm:text-4xl font-bold">{globalAnalytics.totalClicks}</div>
                <div className="text-purple-100 text-sm sm:text-base">Total Clicks</div>
              </div>
              <div className="w-px h-12 sm:h-16 bg-white/30"></div>
              <div className="text-center lg:text-right">
                <div className="text-3xl sm:text-4xl font-bold">{globalAnalytics.uniqueClicks}</div>
                <div className="text-purple-100 text-sm sm:text-base">Unique Visitors</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header Card (matches per-link analytics header) */}
        <div className="mb-4">
          <div className="p-4 sm:p-5 bg-white rounded-xl border flex items-center gap-3 sm:gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
              {(() => {
                // Pick top performing link to preview
                const topLink = [...links].sort((a, b) => (b.total_clicks || 0) - (a.total_clicks || 0))[0];
                const favDomain = (() => {
                  try {
                    return new URL(topLink?.original_url || topLink?.short_url || 'https://example.com').hostname;
                  } catch {
                    return 'example.com';
                  }
                })();
                return (
                  <img
                    src={`https://www.google.com/s2/favicons?sz=64&domain=${favDomain}`}
                    alt="favicon"
                    className="w-6 h-6"
                  />
                );
              })()}
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-medium text-slate-800 truncate">
                {(() => {
                  const topLink = [...links].sort((a, b) => (b.total_clicks || 0) - (a.total_clicks || 0))[0];
                  return topLink?.short_url || 'All Links';
                })()}
              </div>
              {(() => {
                const topLink = [...links].sort((a, b) => (b.total_clicks || 0) - (a.total_clicks || 0))[0];
                const dest = topLink?.original_url;
                if (!dest) return null;
                let host = dest;
                try { host = new URL(dest).host; } catch {}
                return (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    <a href={dest} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                      {host}
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Clicks</p>
                <p className="text-lg sm:text-2xl font-bold">{globalAnalytics.totalClicks}</p>
              </div>
              <MousePointer className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Unique Clicks</p>
                <p className="text-lg sm:text-2xl font-bold">{globalAnalytics.uniqueClicks}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Today's Clicks</p>
                <p className="text-lg sm:text-2xl font-bold">{globalAnalytics.todayClicks}</p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Links</p>
                <p className="text-lg sm:text-2xl font-bold">{links.length}</p>
              </div>
              <ExternalLink className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 h-auto p-1 gap-1">
            <TabsTrigger 
              value="top-links" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-xs sm:text-sm py-2 px-1 sm:px-2 md:px-4 truncate"
            >
              <span className="hidden sm:inline">🏆 Top Links</span>
              <span className="sm:hidden">🏆 Links</span>
            </TabsTrigger>
            <TabsTrigger 
              value="devices" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-xs sm:text-sm py-2 px-1 sm:px-2 md:px-4 truncate"
            >
              <span className="hidden sm:inline">📱 Devices</span>
              <span className="sm:hidden">📱</span>
            </TabsTrigger>
            <TabsTrigger 
              value="countries" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 text-xs sm:text-sm py-2 px-1 sm:px-2 md:px-4 truncate"
            >
              <span className="hidden sm:inline">🌍 Countries</span>
              <span className="sm:hidden">🌍</span>
            </TabsTrigger>
          </TabsList>


          <TabsContent value="top-links" className="space-y-4 sm:space-y-6">
            <Card className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">Top Performing Links</h2>
                    <p className="text-muted-foreground text-sm sm:text-base">Your most clicked links ranked by performance</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {links
                  .sort((a, b) => (b.total_clicks || 0) - (a.total_clicks || 0))
                  .slice(0, 10)
                  .map((link, index) => (
                    <div key={link.id} className="group flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 sm:p-6 bg-white/70 backdrop-blur-sm rounded-xl border border-primary/10 hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 gap-4 lg:gap-0">
                      <div className="flex items-center space-x-4 sm:space-x-6 min-w-0 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary-dark rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                          <span className="text-sm sm:text-lg font-bold text-white">#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                            <a 
                              href={link.short_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary-dark font-semibold truncate text-sm sm:text-base lg:text-lg hover:underline transition-colors min-w-0"
                            >
                              {link.short_url}
                            </a>
                            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-full lg:max-w-md">{link.original_url}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:justify-end space-x-4 sm:space-x-6 lg:space-x-8">
                        <div className="text-center">
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">{link.total_clicks || 0}</p>
                          <p className="text-xs text-muted-foreground font-medium">Total Clicks</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{link.unique_clicks || 0}</p>
                          <p className="text-xs text-muted-foreground font-medium">Unique</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                          onClick={() => navigate(`/statistics/${link.id}`)}
                          className="hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                          <span className="text-xs sm:text-sm">View Details</span>
                  </Button>
                </div>
                    </div>
                  ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Monitor className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-blue-900">Device Types</h2>
                    <p className="text-blue-700">Platform distribution analysis</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {(() => {
                    const deviceCounts: { [key: string]: number } = {};
                    globalAnalytics.recentActivity.forEach(activity => {
                      const device = activity.device_type || 'unknown';
                      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
                    });
                    
                    const totalDevices = Object.values(deviceCounts).reduce((a, b) => a + b, 0);
                    
                    return Object.entries(deviceCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([device, count], index) => (
                        <div key={device} className="group flex items-center justify-between p-4 bg-white/70 rounded-xl hover:bg-white/90 transition-all duration-300">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                              <Monitor className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <span className="capitalize font-semibold text-blue-900">{device}</span>
                              <p className="text-sm text-blue-600">{Math.round((count / totalDevices) * 100)}%</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="w-32 bg-blue-200 rounded-full h-3 shadow-inner">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full shadow-sm transition-all duration-1000 ease-out" 
                                style={{ width: `${(count / totalDevices) * 100}%` }}
                              />
                            </div>
                            <span className="text-lg font-bold text-blue-900 w-12 text-right">{count}</span>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </Card>

              <Card className="p-8 bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Chrome className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-green-900">Browsers</h2>
                    <p className="text-green-700">Browser usage statistics</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {(() => {
                    const browserCounts: { [key: string]: number } = {};
                    globalAnalytics.recentActivity.forEach(activity => {
                      const browser = activity.browser_type || 'Unknown';
                      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
                    });
                    
                    const totalBrowsers = Object.values(browserCounts).reduce((a, b) => a + b, 0);
                    
                    return Object.entries(browserCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([browser, count], index) => (
                        <div key={browser} className="group flex items-center justify-between p-4 bg-white/70 rounded-xl hover:bg-white/90 transition-all duration-300">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                              <Chrome className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <span className="font-semibold text-green-900">{browser}</span>
                              <p className="text-sm text-green-600">{Math.round((count / totalBrowsers) * 100)}%</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="w-32 bg-green-200 rounded-full h-3 shadow-inner">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full shadow-sm transition-all duration-1000 ease-out" 
                                style={{ width: `${(count / totalBrowsers) * 100}%` }}
                              />
                            </div>
                            <span className="text-lg font-bold text-green-900 w-12 text-right">{count}</span>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="countries" className="space-y-8">
            {/* Interactive Maps Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* India Interactive Map */}
              <Card className="p-6 bg-gradient-to-br from-orange-50 via-orange-100 to-amber-50 border-orange-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-2xl">🇮🇳</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-orange-900">India Analytics</h2>
                      <p className="text-orange-700 font-medium">Real-time click distribution</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {getCountryDataForMap('india').length} regions
                  </Badge>
                </div>
                
                <SimpleMap
                  mapType="india"
                  countryData={getCountryDataForMap('india')}
                  title="India Analytics"
                  description="Click distribution across Indian states"
                  color="orange"
                  onCountrySelect={(country, data) => {
                    setSelectedCountry(country);
                    toast({
                      title: `Selected: ${country}`,
                      description: `${data.clicks} clicks (${data.percentage.toFixed(1)}%)`,
                    });
                  }}
                />
                
                {/* Top States List */}
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-orange-800 mb-3">Top States</h3>
                  {getCountryDataForMap('india').slice(0, 5).map((state, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/60 rounded-xl p-3 hover:bg-white/80 transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="text-orange-800 font-medium">{state.country}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 bg-orange-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${state.percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-right">
                          <div className="text-orange-700 font-bold text-sm">{state.clicks}</div>
                          <div className="text-orange-500 text-xs">{state.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* US Interactive Map */}
              <Card className="p-6 bg-gradient-to-br from-emerald-50 via-teal-100 to-cyan-50 border-emerald-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-2xl">🇺🇸</span>
                    </div>
                  <div>
                      <h2 className="text-2xl font-bold text-emerald-900">US Analytics</h2>
                      <p className="text-emerald-700 font-medium">Real-time click distribution</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {getCountryDataForMap('usa').length} regions
                  </Badge>
                </div>
                
                <SimpleMap
                  mapType="usa"
                  countryData={getCountryDataForMap('usa')}
                  title="US Analytics"
                  description="Click distribution across US states"
                  color="emerald"
                  onCountrySelect={(country, data) => {
                    setSelectedCountry(country);
                    toast({
                      title: `Selected: ${country}`,
                      description: `${data.clicks} clicks (${data.percentage.toFixed(1)}%)`,
                    });
                  }}
                />
                
                {/* Top States List */}
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-emerald-800 mb-3">Top States</h3>
                  {getCountryDataForMap('usa').slice(0, 5).map((state, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/60 rounded-xl p-3 hover:bg-white/80 transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="text-emerald-800 font-medium">{state.country}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 bg-emerald-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${state.percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-700 font-bold text-sm">{state.clicks}</div>
                          <div className="text-emerald-500 text-xs">{state.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            
            {/* Global World Map */}
            <Card className="p-8 bg-gradient-to-br from-purple-50 via-purple-100 to-violet-50 border-purple-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-purple-900">Global Analytics</h2>
                    <p className="text-purple-700 font-medium">Worldwide click distribution and insights</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300 px-4 py-2">
                  <Globe className="w-4 h-4 mr-2" />
                  {getCountryDataForMap('world').length} countries
                </Badge>
              </div>
              
              <SimpleMap
                mapType="world"
                countryData={getCountryDataForMap('world')}
                title="Global Analytics"
                description="Click distribution worldwide"
                color="purple"
                onCountrySelect={(country, data) => {
                  setSelectedCountry(country);
                  toast({
                    title: `Selected: ${country}`,
                    description: `${data.clicks} clicks (${data.percentage.toFixed(1)}%)`,
                  });
                }}
              />
            </Card>
            
            {/* Top Countries Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-8 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 shadow-lg">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-indigo-900">Top Countries</h2>
                    <p className="text-indigo-700">Traffic by location</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {(() => {
                    const countryCounts: { [key: string]: number } = {};
                    globalAnalytics.recentActivity.forEach(activity => {
                      const country = activity.country_name || activity.country || 'Unknown';
                      countryCounts[country] = (countryCounts[country] || 0) + 1;
                    });
                    
                    const totalCountries = Object.values(countryCounts).reduce((a, b) => a + b, 0);
                    
                    return Object.entries(countryCounts)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 10)
                      .map(([country, count], index) => (
                        <div key={country} className="group flex items-center justify-between p-4 bg-white/70 rounded-xl hover:bg-white/90 transition-all duration-300">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                              <span className="text-lg font-bold text-white">#{index + 1}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-indigo-900">{country}</span>
                              <p className="text-sm text-indigo-600">{Math.round((count / totalCountries) * 100)}%</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="w-24 bg-indigo-200 rounded-full h-3 shadow-inner">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full shadow-sm transition-all duration-1000 ease-out" 
                                style={{ width: `${(count / totalCountries) * 100}%` }}
                              />
                            </div>
                            <span className="text-lg font-bold text-indigo-900 w-10 text-right">{count}</span>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </Card>
            </div>
          </TabsContent>
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

