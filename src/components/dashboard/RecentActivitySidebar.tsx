import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Smartphone, Monitor, Globe, TrendingUp, ExternalLink, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  link_id: string;
  ip_address: string;
  user_agent: string;
  country: string;
  city: string;
  device_type: string;
  browser: string;
  os: string;
  referrer: string;
  created_at: string;
  original_url: string;
  short_url: string;
}

const RecentActivitySidebar = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);
  const [statsByLink, setStatsByLink] = useState<Record<string, { unique: number; yesterday: number; today: number }>>({});

  useEffect(() => {
    fetchRecentActivity();

    // Set up real-time subscription for clicks - pure real-time, no manual refreshing
    const subscription = supabase
      .channel('recent-activity-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'clicks'
      }, async (payload) => {
        console.log('🔥 Real-time click detected!', payload);
        const newClick = payload.new;
        
        // Get current user to check if this click belongs to their links
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get the link details for this click
        const { data: link } = await supabase
          .from('links')
          .select('original_url, short_url')
          .eq('id', newClick.link_id)
          .eq('user_id', user.id)
          .single();

        if (link) {
          // Add the new activity to the beginning of the list
          const newActivity = {
            id: newClick.id,
            link_id: newClick.link_id,
            ip_address: newClick.ip_address,
            user_agent: newClick.user_agent,
            country: newClick.country || 'Unknown',
            city: newClick.city || 'Unknown',
            device_type: newClick.device_type || 'desktop',
            browser: newClick.browser || 'Unknown',
            os: newClick.os || 'Unknown',
            referrer: newClick.referer || '',
            created_at: newClick.created_at,
            original_url: link.original_url,
            short_url: link.short_url
          };
          
          setActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep only 10 items
          console.log('✅ Added new activity in real-time:', newActivity);
        }
      })
      .subscribe((status) => {
        console.log('Recent Activity subscription status:', status);
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchRecentActivity = async () => {
    // Prevent multiple simultaneous fetches
    if (loading) {
      console.log('Already loading, skipping fetch');
      return;
    }
    
    setLoading(true);
    console.log('🔄 Fetching recent activity...');
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No user found');
        setActivities([]);
        return;
      }

      console.log('Starting Recent Activity fetch for user:', user.id);

      // First, get user's links
      const { data: userLinks, error: linksError } = await supabase
        .from('links')
        .select('id, short_url, original_url')
        .eq('user_id', user.id);

      console.log('User links query result:', { userLinks, linksError });

      if (linksError) {
        console.error('Error fetching user links:', linksError);
        setActivities([]);
        return;
      }

      if (!userLinks || userLinks.length === 0) {
        console.log('No links found for user - this might be why Recent Activity is empty');
        setActivities([]);
        return;
      }

      const linkIds = userLinks.map(link => link.id);
      console.log('Link IDs to search clicks for:', linkIds);

      // Fetch recent clicks for user's links - try a different approach
      const { data: clicks, error } = await supabase
        .from('clicks')
        .select('*')
        .in('link_id', linkIds)
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('Recent Activity - User ID:', user.id);
      console.log('Recent Activity - Link IDs:', linkIds);
      console.log('Recent Activity - Clicks data:', clicks);
      console.log('Recent Activity - Error:', error);
      
      if (clicks && clicks.length > 0) {
        console.log('✅ Recent Activity: Found', clicks.length, 'clicks');
      } else {
        console.log('❌ Recent Activity: No clicks found');
      }

      if (error) {
        console.error('Error fetching clicks:', error);
        setActivities([]);
        return;
      }

      // Create a map of link details from userLinks
      const linkMap = new Map(userLinks?.map(link => [link.id, link]) || []);

      // Transform the data to match our interface
      const transformedActivities = clicks?.map(click => {
        const link = linkMap.get(click.link_id);
        return {
          id: click.id,
          link_id: click.link_id,
          ip_address: click.ip_address,
          user_agent: click.user_agent,
          country: click.country || 'Unknown',
          city: click.city || 'Unknown',
          device_type: click.device_type || 'desktop',
          browser: click.browser || 'Unknown',
          os: click.os || 'Unknown',
          referrer: click.referer || '',
          created_at: click.created_at,
          original_url: link?.original_url || 'Unknown',
          short_url: link?.short_url || 'Unknown'
        };
      }) || [];

      console.log('Transformed activities:', transformedActivities);

      setActivities(transformedActivities);

      // Compute per-link stats for the UI (unique, yesterday, today)
      const linkIdsForStats = Array.from(new Set(transformedActivities.map(a => a.link_id)));
      await computeStatsForLinks(linkIdsForStats);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const computeStatsForLinks = async (linkIds: string[]) => {
    try {
      if (linkIds.length === 0) return;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yest = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yestStr = yest.toISOString().split('T')[0];

      // Fetch last 30 days of clicks for these links and aggregate client-side
      const since = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: clicksRange, error } = await supabase
        .from('clicks')
        .select('link_id, ip_address, created_at')
        .in('link_id', linkIds)
        .gte('created_at', since);
      if (error) {
        console.error('Error fetching stats range:', error);
        return;
      }

      const nextStats: Record<string, { unique: number; yesterday: number; today: number }> = {};
      for (const linkId of linkIds) {
        const rows = (clicksRange || []).filter(r => r.link_id === linkId);
        const uniqueIPs = new Set(rows.map(r => r.ip_address).filter(Boolean));
        const yCount = rows.filter(r => r.created_at?.startsWith(yestStr)).length;
        const tCount = rows.filter(r => r.created_at?.startsWith(todayStr)).length;
        nextStats[linkId] = { unique: uniqueIPs.size, yesterday: yCount, today: tCount };
      }
      setStatsByLink(nextStats);
    } catch (e) {
      console.error('Failed computing per-link stats:', e);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-3 h-3" />;
      case 'desktop':
        return <Monitor className="w-3 h-3" />;
      default:
        return <Monitor className="w-3 h-3" />;
    }
  };

  const getBrowserColor = (browser: string) => {
    switch (browser.toLowerCase()) {
      case 'chrome':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'firefox':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'safari':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'edge':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
  };

  return (
    <Card className="h-full flex flex-col bg-card border-card-border">
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-card-foreground">Recent Activity</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecentActivity}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Live click tracking</p>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Globe className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h4 className="text-xl font-semibold text-card-foreground mb-2">No Recent Activity</h4>
              <p className="text-sm text-muted-foreground mb-6">Start sharing your links to see click tracking here</p>
            </div>
            <div className="w-full space-y-4">
              <div className="bg-surface-secondary rounded-lg p-4">
                <h5 className="font-medium text-card-foreground mb-2">What you'll see here:</h5>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Real-time click tracking</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>Device and location data</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-warning rounded-full"></div>
                    <span>Referrer information</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-info rounded-full"></div>
                    <span>Browser analytics</span>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <h5 className="font-medium text-primary mb-2">Quick Tips:</h5>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• Share your links on social media</p>
                  <p>• Include in emails and messages</p>
                  <p>• Track performance in real-time</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto">
            {activities.map((activity) => {
              const stats = statsByLink[activity.link_id];
              const shortDisplay = activity.short_url?.replace('https://', '').replace('http://', '') || 'Link';
              return (
                <div key={activity.id} className="bg-white rounded-lg p-3 border border-card-border hover:shadow-sm transition-shadow">
                  {/* Top row: short link and time */}
                  <div className="flex items-center justify-between mb-1">
                    <a href={activity.short_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline truncate">
                      {shortDisplay}
                    </a>
                    <span className="text-xs text-muted-foreground">{formatTimeAgo(activity.created_at)}</span>
                  </div>

                  {/* Middle row: location, device, browser, referrer */}
                  <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{activity.city}, {activity.country}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">{getDeviceIcon(activity.device_type)} {activity.device_type}</span>
                    <span>•</span>
                    <Badge className={`px-1.5 py-0 ${getBrowserColor(activity.browser)}`}>{activity.browser}</Badge>
                    {activity.referrer && (
                      <>
                        <span>•</span>
                        <a href={activity.referrer} target="_blank" rel="noopener noreferrer" className="truncate max-w-[160px] text-primary hover:underline">
                          {activity.referrer?.replace('https://', '').replace('http://', '')}
                        </a>
                      </>
                    )}
                  </div>

                  {/* Bottom stats row */}
                  {stats && (
                    <div className="mt-2 text-xs">
                      <span className="text-fuchsia-600 font-medium">➜ {stats.unique} Unique Clicks</span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span className="text-rose-600 font-medium">{stats.yesterday} Yesterday Clicks</span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span className="text-green-600 font-medium">{stats.today} Today Clicks</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecentActivitySidebar;