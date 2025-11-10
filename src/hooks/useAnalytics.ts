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
      
      // Calculate date range for current period - make it more flexible
      const periodStart = startDate ? startDate.toISOString().split('T')[0] : 
                         new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 90 days instead of 30
      const periodEnd = endDate ? endDate.toISOString().split('T')[0] : today;

      console.log('Fetching analytics for user:', user.id);

      // First, let's check if user has any links at all
      const { data: userLinks, error: linksError } = await supabase
        .from('links')
        .select('id, short_code, user_id')
        .eq('user_id', user.id);

      console.log('📊 User links:', userLinks);
      if (linksError) {
        console.error('❌ Error fetching user links:', linksError);
      }

      // Get total clicks (all time) for user's links from actual clicks table
      const { data: totalClicksData, error: totalError } = await supabase
        .from('clicks')
        .select(`
          id,
          created_at,
          links!inner(
            user_id
          )
        `)
        .eq('links.user_id', user.id);

      if (totalError) {
        console.error('❌ Error fetching total clicks:', totalError);
        throw totalError;
      }

      console.log('📊 Total clicks data:', totalClicksData);
      const totalClicks = totalClicksData?.length || 0;

      // Let's also check if there are ANY clicks in the database at all
      const { data: allClicks, error: allClicksError } = await supabase
        .from('clicks')
        .select('id, created_at, link_id')
        .limit(10);
        
      console.log('📊 Sample clicks from database (any user):', allClicks);
      if (allClicksError) {
        console.error('❌ Error fetching sample clicks:', allClicksError);
      }

      // Get current period clicks for user's links from actual clicks table
      const { data: periodClicksData, error: periodError } = await supabase
        .from('clicks')
        .select(`
          id,
          created_at,
          links!inner(
            user_id
          )
        `)
        .eq('links.user_id', user.id)
        .gte('created_at', `${periodStart}T00:00:00.000Z`)
        .lte('created_at', `${periodEnd}T23:59:59.999Z`);

      if (periodError) throw periodError;

      const currentPeriodClicks = periodClicksData?.length || 0;

      // Get today's clicks for user's links from actual clicks table
      const { data: todayClicksData, error: todayError } = await supabase
        .from('clicks')
        .select(`
          id,
          created_at,
          links!inner(
            user_id
          )
        `)
        .eq('links.user_id', user.id)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (todayError) throw todayError;

      const todayClicks = todayClicksData?.length || 0;

      // Get chart data for the selected period for user's links with URL breakdown from actual clicks table
      console.log('📊 Fetching chart data with filters:', {
        periodStart,
        periodEnd,
        userId: user.id
      });
      
      let { data: chartData, error: chartError } = await supabase
        .from('clicks')
        .select(`
          created_at,
          links!inner(
            user_id,
            short_code,
            original_url
          )
        `)
        .eq('links.user_id', user.id)
        .gte('created_at', `${periodStart}T00:00:00.000Z`)
        .lte('created_at', `${periodEnd}T23:59:59.999Z`)
        .order('created_at', { ascending: true });

      if (chartError) {
        console.error('❌ Chart data error:', chartError);
        throw chartError;
      }
      
      console.log('📊 Raw chart data from database:', chartData);

      // If no data with inner join, try a different approach
      if (!chartData || chartData.length === 0) {
        console.log('📊 No data with inner join, trying alternative approach...');
        
        // Get all clicks for user's link IDs
        const userLinkIds = userLinks?.map(link => link.id) || [];
        console.log('📊 User link IDs:', userLinkIds);
        
        if (userLinkIds.length > 0) {
          const { data: altChartData, error: altError } = await supabase
            .from('clicks')
            .select('created_at, link_id')
            .in('link_id', userLinkIds)
            .gte('created_at', `${periodStart}T00:00:00.000Z`)
            .lte('created_at', `${periodEnd}T23:59:59.999Z`)
            .order('created_at', { ascending: true });
            
          if (altError) {
            console.error('❌ Alternative chart data error:', altError);
          } else {
            console.log('📊 Alternative chart data:', altChartData);
            // Use alternative data if available
            if (altChartData && altChartData.length > 0) {
              chartData = altChartData.map(click => ({
                created_at: click.created_at,
                links: userLinks?.find(l => l.id === click.link_id)
              }));
            } else {
              // If still no data, try without date filters
              console.log('📊 No data with date filters, trying all clicks...');
              const { data: allClicksData, error: allClicksError } = await supabase
                .from('clicks')
                .select('created_at, link_id')
                .in('link_id', userLinkIds)
                .order('created_at', { ascending: true });
                
              if (!allClicksError && allClicksData && allClicksData.length > 0) {
                console.log('📊 All clicks data:', allClicksData);
                chartData = allClicksData.map(click => ({
                  created_at: click.created_at,
                  links: userLinks?.find(l => l.id === click.link_id)
                }));
              }
            }
          }
        }
      }

      // Process chart data with URL breakdown from actual clicks
      const processedChartData = chartData?.reduce((acc, click) => {
        // Use UTC date to avoid timezone issues
        const clickDate = new Date(click.created_at);
        const date = clickDate.toISOString().split('T')[0];
        const existingDay = acc.find(d => d.date === date);
        
        console.log(`📊 Processing click: ${click.created_at} -> ${date}`);
        
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
        todayClicks,
        periodStart,
        periodEnd,
        user: user.id
      });
      
      // Debug: Log each day's data
      processedChartData.forEach(day => {
        console.log(`📊 Chart Day ${day.date}: ${day.clicks} clicks`);
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
        .order('created_at', { ascending: false })
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
          clicked_at: click.created_at,
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