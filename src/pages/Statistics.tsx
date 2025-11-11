import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Globe, Monitor, Chrome, User, RefreshCw, Home, Shuffle, Smartphone, Apple, Share2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLinks } from '@/hooks/useLinks';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay, subMonths, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import WorldMap from '@/components/analytics/WorldMap';
import ViewAllActivityModal from '@/components/analytics/ViewAllActivityModal';
import PlatformsAnalytics from '@/components/analytics/PlatformsAnalytics';
import BrowserAnalytics from '@/components/analytics/BrowserAnalytics';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Globe2, MapPin as MapPinIcon } from 'lucide-react';
import DailyClicksChart from '@/components/analytics/DailyClicksChart';

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
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => ({
    from: subDays(new Date(), 14),
    to: new Date()
  }));

  // Helpers
  const getFlagEmoji = (country?: string, countryName?: string) => {
    const name = (countryName || '').toLowerCase();
    if (name === 'india') return '🇮🇳';
    const code = (country || '').toUpperCase();
    if (code.length === 2) {
      const A = 127462; // regional indicator A
      const Z = 127487;
      const base = 127397; // offset
      const first = code.codePointAt(0) || 65;
      const second = code.codePointAt(1) || 65;
      if (first >= 65 && first <= 90 && second >= 65 && second <= 90) {
        return String.fromCodePoint(base + first, base + second);
      }
    }
    return '🌍';
  };

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
        
        // Use selected date range (inclusive)
        const startDate = startOfDay(dateRange.from);
        const endDate = endOfDay(dateRange.to);
        
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

        // Fetch recent clicks for this link with destination_url for historical accuracy
        // The destination_url field stores the URL that was actually clicked at the time
        const { data: clicksData, error: clicksError } = await supabase
          .from('clicks')
          .select('*')
          .eq('link_id', selectedLink.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        if (clicksError) {
          console.error('Error fetching clicks:', clicksError);
          throw clicksError;
        }
        
        console.log('Recent clicks data:', clicksData);

        // Calculate summary metrics for selected range
        const { data: allClicksData, error: allClicksError } = await supabase
          .from('clicks')
          .select('id, ip_address, created_at, referer, country, country_name, source_platform')
          .eq('link_id', selectedLink.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (allClicksError) throw allClicksError;

        // Also fetch ALL-TIME clicks for card parity with outside list
        const { data: allTimeClicks, error: allTimeError } = await supabase
          .from('clicks')
          .select('id, ip_address')
          .eq('link_id', selectedLink.id);
        if (allTimeError) throw allTimeError;

        // Calculate totals
        let totalClicks = allTimeClicks?.length || 0;
        
        // Calculate unique clicks based on IP address
        const uniqueIPs = new Set((allTimeClicks || []).map((click: any) => click.ip_address).filter(Boolean) || []);
        let uniqueClicks = uniqueIPs.size;

        console.log('Statistics - Click counts from actual clicks table:', {
          totalClicks,
          uniqueClicks,
          allClicksCount: allClicksData?.length || 0,
          uniqueIPsCount: uniqueIPs.size
        });
        
        // Get top country, top referrer, and top source platform from all clicks in range (more accurate)
        const countryCounts: { [key: string]: number } = {};
        const referrerCounts: { [key: string]: number } = {};
        const destinationCounts: { [key: string]: number } = {};
        const sourcePlatformCounts: { [key: string]: number } = {};
        (allClicksData || []).forEach((click: any) => {
          const countryKey = click.country_name || click.country || 'Unknown';
          countryCounts[countryKey] = (countryCounts[countryKey] || 0) + 1;
          const ref = (click.referer && click.referer !== '') ? click.referer : 'Direct';
          referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
          const destUrl = (click.destination_url || selectedLink.original_url || '').toString();
          if (destUrl) destinationCounts[destUrl] = (destinationCounts[destUrl] || 0) + 1;
          // Track source platform (where link was shared/opened from)
          const sourcePlatform = click.source_platform || 'Direct';
          sourcePlatformCounts[sourcePlatform] = (sourcePlatformCounts[sourcePlatform] || 0) + 1;
        });
        const topCountry = Object.keys(countryCounts).length
          ? Object.entries(countryCounts).sort((a,b) => b[1]-a[1])[0][0]
          : 'Unknown';
        const topReferrerRaw = Object.keys(referrerCounts).length
          ? Object.entries(referrerCounts).sort((a,b) => b[1]-a[1])[0][0]
          : 'Direct';
        const topReferrer = (() => {
          if (topReferrerRaw === 'Direct') return 'Direct';
          try { return new URL(topReferrerRaw).host; } catch { return topReferrerRaw; }
        })();
        const topDestination = (() => {
          if (!Object.keys(destinationCounts).length) {
            try { return new URL(selectedLink.original_url).host; } catch { return selectedLink.original_url; }
          }
          const top = Object.entries(destinationCounts).sort((a,b)=>b[1]-a[1])[0][0];
          try { return new URL(top).host; } catch { return top; }
        })();
        const topDestinationUrlRaw = (() => {
          if (!Object.keys(destinationCounts).length) return selectedLink.original_url;
          return Object.entries(destinationCounts).sort((a,b)=>b[1]-a[1])[0][0];
        })();
        const topSourcePlatform = Object.keys(sourcePlatformCounts).length
          ? Object.entries(sourcePlatformCounts).sort((a,b) => b[1]-a[1])[0][0]
          : 'Direct';

        // Build per-day points for the selected range
        const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
        const chartData = Array.from({ length: totalDays }, (_, i) => {
          const d = startOfDay(addDays(startDate, i));
          const dateStr = format(d, 'yyyy-MM-dd');
          const dayClicks = (allClicksData || []).filter((c: any) => (c.created_at || '').startsWith(dateStr));
          const dayUniqueIPs = new Set(dayClicks.map((c: any) => c.ip_address).filter(Boolean));
          return { date: dateStr, clicks: dayClicks.length, unique: dayUniqueIPs.size };
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
          topReferrer, // Show actual referring website (where link was embedded/clicked from)
          topDestinationUrl: topDestinationUrlRaw,
          topSourcePlatform,
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
  }, [selectedLink, toast, dateRange]);

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

  // Prepare daily chart for selected range
  const dailyChartData = (linkAnalytics?.chartData || []).map((d: any) => ({
    date: format(new Date(d.date), 'dd LLL'),
    clicks: d.clicks
  }));
  const maxClicks = Math.max(...dailyChartData.map(d => d.clicks), 0);
  const roundedMax = Math.max(200, Math.ceil(maxClicks / 200) * 200);
  const yAxisLabels = Array.from({ length: roundedMax / 200 + 1 }, (_, i) => i * 200);
  
  // Chart data calculated

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Button variant="ghost" onClick={() => navigate('/')} className="flex-shrink-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold truncate text-slate-900">Link Analytics</h1>
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
        {/* Link Header Card with favicon */}
        <Card className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
            {/* Favicon based on original URL host if present */}
            <img
              src={`https://www.google.com/s2/favicons?sz=64&domain=${(() => {
                try { return new URL(selectedLink.original_url || selectedLink.short_url).hostname; } catch { return 'example.com'; }
              })()}`}
              alt="favicon"
              className="w-6 h-6"
            />
          </div>
          <div className="min-w-0">
            <a
              href={selectedLink.short_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm sm:text-base font-medium text-slate-800 hover:underline truncate"
            >
              {selectedLink.short_url}
            </a>
            {linkAnalytics?.topReferrer && (
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                <a
                  href={(linkAnalytics as any).topDestinationUrl || selectedLink.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:underline"
                >
                  {linkAnalytics.topReferrer}
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="p-4 sm:p-6 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Clicks</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{linkAnalytics.totalClicks}</p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Unique Clicks</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{linkAnalytics.uniqueClicks}</p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Top Country</p>
                <p className="text-sm sm:text-lg font-semibold flex items-center space-x-2">
                  <span className="text-lg sm:text-xl">{getFlagEmoji(linkAnalytics.topCountry, linkAnalytics.topCountry)}</span>
                  <span className="truncate">{linkAnalytics.topCountry}</span>
                </p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 shadow-sm hover:shadow transition">
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
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Globe className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Top Source</p>
                <p className="text-xs sm:text-sm font-semibold truncate max-w-[120px] sm:max-w-[150px]">
                  {(linkAnalytics as any).topSourcePlatform || 'Direct'}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Share2 className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs row (visual navigation) */}
        <div className="w-full bg-white border rounded-lg p-2 flex flex-wrap gap-2 items-center">
          <Button variant="ghost" className="h-9 px-3 data-[active=true]:bg-slate-100" data-active>
            <Home className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Summary</span>
          </Button>
          <Button variant="ghost" className="h-9 px-3">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Countries & Cities</span>
          </Button>
          <Button variant="ghost" className="h-9 px-3">
            <Monitor className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Platforms</span>
          </Button>
          <Button variant="ghost" className="h-9 px-3">
            <Chrome className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Browsers</span>
          </Button>
          <Button variant="ghost" className="h-9 px-3">
            <User className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Languages</span>
          </Button>
          <Button variant="ghost" className="h-9 px-3">
            <Globe className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Referrers</span>
          </Button>
          <Button variant="ghost" className="h-9 px-3">
            <Shuffle className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">A/B Testing</span>
          </Button>
          <div className="ml-auto" />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {/* Clicks Section - Daily chart and export */}
              <Card className="p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Clicks</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {format(dateRange.from, 'MM/dd/yyyy')} - {format(dateRange.to, 'MM/dd/yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-[240px] justify-start text-left font-normal')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    numberOfMonths={2}
                    selected={dateRange}
                    onSelect={(range: any) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Button 
              onClick={async () => {
                try {
                  const { data: clicksData, error } = await supabase
                    .from('clicks')
                    .select('*')
                    .eq('link_id', selectedLink.id)
                    .gte('created_at', startOfDay(dateRange.from).toISOString())
                    .lte('created_at', endOfDay(dateRange.to).toISOString())
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
          </div>

                {/* Home-style dynamic chart */}
                <div className="space-y-3 sm:space-y-4">
                  <DailyClicksChart from={dateRange.from} to={dateRange.to} linkId={selectedLink.id} showMetrics={false} />
                </div>
        </Card>

              {/* Recent Activity - full width below chart */}
              <Card className="p-4 sm:p-6 shadow-sm">
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
                <div key={activity.id || index} className="p-4 bg-white border rounded-lg hover:shadow-sm transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {activity.source_platform && activity.source_platform !== 'Direct' && (() => {
                          const platform = activity.source_platform.toLowerCase();
                          if (platform.includes('whatsapp')) {
                            return (
                              <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                WA
                              </div>
                            );
                          } else if (platform.includes('facebook')) {
                            return (
                              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                FB
                              </div>
                            );
                          } else if (platform.includes('twitter') || platform.includes('x')) {
                            return (
                              <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                X
                              </div>
                            );
                          } else if (platform.includes('instagram')) {
                            return (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                IG
                              </div>
                            );
                          } else if (platform.includes('telegram')) {
                            return (
                              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                TG
                              </div>
                            );
                          } else if (platform.includes('linkedin')) {
                            return (
                              <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                LI
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <span className="text-lg">{getFlagEmoji(activity.country, activity.country_name)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {(() => {
                            const city = activity.city && activity.city !== 'Unknown' && activity.city !== null ? activity.city : null;
                            const countryName = activity.country_name && activity.country_name !== 'Unknown' && activity.country_name !== null ? activity.country_name : null;
                            const countryCode = activity.country && activity.country !== 'Unknown' && activity.country !== null ? activity.country : null;
                            
                            if (city && countryName) {
                              return `${city}, ${countryName}`;
                            } else if (city && countryCode) {
                              return `${city}, ${countryCode}`;
                            } else if (countryName) {
                              return `Somewhere in ${countryName}`;
                            } else if (countryCode) {
                              return `Somewhere in ${countryCode}`;
                            } else {
                              return 'Unknown';
                            }
                          })()}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{(() => { const t = new Date(activity.clicked_at || activity.created_at); const diff = Math.floor((Date.now() - t.getTime())/60000); return diff < 60 ? `${diff} minutes ago` : `${Math.floor(diff/60)} hours ago`; })()}</div>
                        {(() => {
                          // Get the embedded website from referer
                          let embeddedWebsite = null;
                          let isOurDomain = false;
                          
                          if (activity.referer && activity.referer !== 'Direct') {
                            try {
                              const url = new URL(activity.referer);
                              const hostname = url.hostname.replace('www.', '').replace('m.', '');
                              
                              // Check if it's our own domain
                              if (hostname.includes('vercel.app') || 
                                  hostname.includes('swift-link') || 
                                  hostname.includes('247l.ink') ||
                                  hostname.includes('localhost')) {
                                isOurDomain = true;
                              } else {
                                embeddedWebsite = hostname;
                              }
                            } catch {
                              embeddedWebsite = activity.referer;
                            }
                          }
                          
                          // Show platform AND embedded website (like b2u.io)
                          const platform = activity.source_platform && activity.source_platform !== 'Direct' 
                            ? activity.source_platform 
                            : null;
                          
                          // If we have platform or embedded website, show them
                          if (platform || embeddedWebsite) {
                            return (
                              <div className="flex items-center gap-2 text-xs truncate mt-1">
                                {platform && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <Share2 className="w-3 h-3" />
                                    <span className="font-semibold">{platform}</span>
                                  </div>
                                )}
                                {platform && embeddedWebsite && (
                                  <span className="text-muted-foreground">•</span>
                                )}
                                {embeddedWebsite && (
                                  <div className="flex items-center gap-1 text-primary">
                                    <Globe className="w-3 h-3" />
                                    <span className="font-medium truncate max-w-[180px] sm:max-w-[280px]">
                                      {embeddedWebsite}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                        {(activity.destination_url || selectedLink?.original_url) && (
                          <div className="flex items-center gap-1 text-xs truncate mt-1">
                            <ExternalLink className="w-3 h-3 text-primary" />
                            <span className="text-muted-foreground">→</span>
                            <a
                              href={activity.destination_url || selectedLink.original_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate max-w-[200px] sm:max-w-[340px] text-primary hover:underline font-medium"
                              title={`Clicked URL: ${activity.destination_url || selectedLink.original_url}`}
                            >
                              {(() => { 
                                const url = activity.destination_url || selectedLink.original_url;
                                try { return new URL(url).hostname; } catch { return url; } 
                              })()}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {(() => {
                          const osLower = String(activity.os || '').toLowerCase();
                          const deviceLower = String(activity.device_type || '').toLowerCase();
                          // Check OS first for more accurate icons
                          if (osLower.includes('ios') || osLower.includes('iphone') || osLower.includes('ipad') || deviceLower.includes('iphone') || deviceLower.includes('ipad')) {
                            return <Apple className="w-3 h-3" />;
                          } else if (osLower.includes('android') || deviceLower.includes('android')) {
                            return <Smartphone className="w-3 h-3 text-green-600" />;
                          } else if (deviceLower.includes('mobile') || deviceLower.includes('tablet')) {
                            return <Smartphone className="w-3 h-3" />;
                          } else {
                            return <Monitor className="w-3 h-3" />;
                          }
                        })()}
                        <span className="capitalize">{activity.device_type || 'desktop'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {(() => {
                          const browserLower = String(activity.browser || '').toLowerCase();
                          if (browserLower.includes('safari')) {
                            return <span className="text-blue-600">🧭</span>;
                          } else if (browserLower.includes('chrome')) {
                            return <Chrome className="w-3 h-3 text-yellow-600" />;
                          } else if (browserLower.includes('firefox')) {
                            return <span className="text-orange-600">🦊</span>;
                          } else {
                            return <Chrome className="w-3 h-3" />;
                          }
                        })()}
                        <span>{activity.browser || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {(() => {
                          const osLower = String(activity.os || '').toLowerCase();
                          if (osLower.includes('ios') || osLower.includes('iphone') || osLower.includes('mac')) {
                            return <Apple className="w-3 h-3" />;
                          } else if (osLower.includes('android')) {
                            return <Smartphone className="w-3 h-3 text-green-600" />;
                          } else if (osLower.includes('windows')) {
                            return <Monitor className="w-3 h-3" />;
                          } else {
                            return <User className="w-3 h-3" />;
                          }
                        })()}
                        <span>{activity.os || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1"><span className="px-1 rounded border text-[10px]">A</span><span>{activity.language || 'EN'}</span></div>
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
