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

      // Get total clicks (all time) for user's links from actual clicks table
      const { data: totalClicksData, error: totalError } = await supabase
        .from('clicks')
        .select(`
          id,
          links!inner(
            user_id
          )
        `)
        .eq('links.user_id', user.id);

      if (totalError) throw totalError;

      const totalClicks = totalClicksData?.length || 0;

      // Get current period clicks for user's links from actual clicks table
      const { data: periodClicksData, error: periodError } = await supabase
        .from('clicks')
        .select(`
          id,
          clicked_at,
          links!inner(
            user_id
          )
        `)
        .eq('links.user_id', user.id)
        .gte('clicked_at', `${periodStart}T00:00:00.000Z`)
        .lte('clicked_at', `${periodEnd}T23:59:59.999Z`);

      if (periodError) throw periodError;

      const currentPeriodClicks = periodClicksData?.length || 0;

      // Get today's clicks for user's links from actual clicks table
      const { data: todayClicksData, error: todayError } = await supabase
        .from('clicks')
        .select(`
          id,
          clicked_at,
          links!inner(
            user_id
          )
        `)
        .eq('links.user_id', user.id)
        .gte('clicked_at', `${today}T00:00:00.000Z`)
        .lte('clicked_at', `${today}T23:59:59.999Z`);

      if (todayError) throw todayError;

      const todayClicks = todayClicksData?.length || 0;

      // Get chart data for the selected period for user's links with URL breakdown from actual clicks table
      const { data: chartData, error: chartError } = await supabase
        .from('clicks')
        .select(`
          clicked_at,
          links!inner(
            user_id,
            short_code,
            original_url
          )
        `)
        .eq('links.user_id', user.id)
        .gte('clicked_at', `${periodStart}T00:00:00.000Z`)
        .lte('clicked_at', `${periodEnd}T23:59:59.999Z`)
        .order('clicked_at', { ascending: true });

      if (chartError) throw chartError;

      // Process chart data with URL breakdown from actual clicks
      const processedChartData = chartData?.reduce((acc, click) => {
        const date = click.clicked_at.split('T')[0];
        const existingDay = acc.find(d => d.date === date);
        
        if (existingDay) {
          existingDay.clicks += 1;
          // Update URL breakdown for the most recent click (or you could accumulate multiple URLs)
          existingDay.urlBreakdown = {
            shortCode: click.links?.short_code,
            originalUrl: click.links?.original_url,
            clicks: existingDay.clicks
          };
        } else {
          acc.push({
            date: date,
            clicks: 1,
            urlBreakdown: {
              shortCode: click.links?.short_code,
              originalUrl: click.links?.original_url,
              clicks: 1
            }
          });
        }
        
        return acc;
      }, [] as any[]) || [];

      // Sort chart data by date to ensure proper display order
      processedChartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

      // Process recent activity without individual queries
      const processedActivity = clicksData?.map((click) => {
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
          todayClicks: 0, // Will be updated by real-time subscriptions
          yesterdayClicks: 0 // Will be updated by real-time subscriptions
        };
      }) || [];

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

    // Set up real-time subscription for analytics updates
    const analyticsSubscription = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'clicks'
      }, (payload) => {
        console.log('📊 Real-time analytics update:', payload);
        fetchAnalytics(); // Refresh analytics when new click is added
        fetchRecentActivity(); // Also refresh recent activity
      })
      .subscribe();

    return () => {
      supabase.removeChannel(analyticsSubscription);
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