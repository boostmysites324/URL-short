import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsData {
  totalClicks: number;
  currentPeriodClicks: number;
  todayClicks: number;
  chartData: Array<{
    date: string;
    clicks: number;
  }>;
}

export interface RecentActivity {
  id: string;
  original_url: string;
  short_url: string;
  city: string;
  country: string;
  country_name: string;
  device_type: string;
  browser_type: string;
  os_type: string;
  clicked_at: string;
  todayClicks: number;
  yesterdayClicks: number;
}

export const useAnalytics = (startDate?: Date, endDate?: Date) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalClicks: 0,
    currentPeriodClicks: 0,
    todayClicks: 0,
    chartData: []
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAnalytics({
          totalClicks: 0,
          currentPeriodClicks: 0,
          todayClicks: 0,
          chartData: []
        });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Calculate date range for current period
      const periodStart = startDate ? startDate.toISOString().split('T')[0] : 
                         new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const periodEnd = endDate ? endDate.toISOString().split('T')[0] : today;

      console.log('Fetching analytics for user:', user.id);

      // Get total clicks (all time) for user's links
      const { data: totalClicksData, error: totalError } = await supabase
        .from('analytics_daily')
        .select(`
          total_clicks,
          links!inner(
            user_id
          )
        `)
        .eq('links.user_id', user.id)
        .gte('date', '2020-01-01');

      if (totalError) throw totalError;

      const totalClicks = totalClicksData?.reduce((sum, day) => sum + (day.total_clicks || 0), 0) || 0;

      // Get current period clicks for user's links
      const { data: periodClicksData, error: periodError } = await supabase
        .from('analytics_daily')
        .select(`
          total_clicks,
          links!inner(
            user_id
          )
        `)
        .eq('links.user_id', user.id)
        .gte('date', periodStart)
        .lte('date', periodEnd);

      if (periodError) throw periodError;

      const currentPeriodClicks = periodClicksData?.reduce((sum, day) => sum + (day.total_clicks || 0), 0) || 0;

      // Get today's clicks for user's links
      const { data: todayClicksData, error: todayError } = await supabase
        .from('analytics_daily')
        .select(`
          total_clicks,
          links!inner(
            user_id
          )
        `)
        .eq('links.user_id', user.id)
        .eq('date', today);

      if (todayError) throw todayError;

      const todayClicks = todayClicksData?.reduce((sum, day) => sum + (day.total_clicks || 0), 0) || 0;

      // Get chart data for the selected period for user's links with URL breakdown
      const { data: chartData, error: chartError } = await supabase
        .from('analytics_daily')
        .select(`
          date, 
          total_clicks,
          links!inner(
            user_id,
            short_code,
            original_url
          )
        `)
        .eq('links.user_id', user.id)
        .gte('date', periodStart)
        .lte('date', periodEnd)
        .order('date', { ascending: true });

      if (chartError) throw chartError;

      // Process chart data with URL breakdown
      const processedChartData = chartData?.map(day => ({
        date: day.date,
        clicks: day.total_clicks || 0,
        urlBreakdown: {
          shortCode: day.links?.short_code,
          originalUrl: day.links?.original_url,
          clicks: day.total_clicks || 0
        }
      })) || [];

      console.log('📊 Analytics Chart Data:', {
        rawData: chartData,
        processedData: processedChartData,
        totalClicks,
        currentPeriodClicks,
        todayClicks
      });

      setAnalytics({
        totalClicks,
        currentPeriodClicks,
        todayClicks,
        chartData: processedChartData
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get recent clicks with link details
      const { data: clicksData, error } = await supabase
        .from('clicks')
        .select(`
          *,
          links!inner(
            original_url,
            short_url
          )
        `)
        .order('clicked_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Process recent activity with today/yesterday counts
      const processedActivity = await Promise.all(
        clicksData?.map(async (click) => {
          // Get today's clicks for this link
          const { data: todayData } = await supabase
            .from('analytics_daily')
            .select('total_clicks')
            .eq('link_id', click.link_id)
            .eq('date', today)
            .single();

          // Get yesterday's clicks for this link
          const { data: yesterdayData } = await supabase
            .from('analytics_daily')
            .select('total_clicks')
            .eq('link_id', click.link_id)
            .eq('date', yesterday)
            .single();

          return {
            id: click.id,
            original_url: click.links.original_url,
            short_url: click.links.short_url,
            city: click.city || 'Unknown',
            country: click.country || 'US',
            country_name: click.country_name || 'United States',
            device_type: click.device_type || 'unknown',
            browser_type: click.browser_type || 'other',
            os_type: click.os_type || 'other',
            clicked_at: click.clicked_at,
            todayClicks: todayData?.total_clicks || 0,
            yesterdayClicks: yesterdayData?.total_clicks || 0
          };
        }) || []
      );

      setRecentActivity(processedActivity);

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recent activity",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchRecentActivity();

    // Subscribe to real-time updates - only listen to analytics_daily changes
    const subscription = supabase
      .channel('analytics-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'analytics_daily'
      }, (payload) => {
        console.log('Real-time analytics update:', payload);
        fetchAnalytics();
      })
      .subscribe();

    // Also set up a periodic refresh as a fallback (reduced frequency)
    const refreshInterval = setInterval(() => {
      fetchAnalytics();
      fetchRecentActivity();
    }, 120000); // Refresh every 2 minutes (silent)

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(refreshInterval);
    };
  }, [startDate, endDate]);

  return {
    analytics,
    recentActivity,
    loading,
    refreshAnalytics: fetchAnalytics,
    refreshActivity: fetchRecentActivity
  };
};