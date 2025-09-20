import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Chrome, Globe, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

interface BrowserData {
  browser: string;
  clicks: number;
  percentage: number;
  color: string;
}

interface BrowserAnalyticsProps {
  linkId: string;
}

const BrowserAnalytics = ({ linkId }: BrowserAnalyticsProps) => {
  const [browserData, setBrowserData] = useState<BrowserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 6),
    to: new Date()
  });

  console.log('BrowserAnalytics - Component rendered with linkId:', linkId);
  
  if (!linkId) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Browsers</h2>
        <div className="text-center py-8 text-muted-foreground">
          <Chrome className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No linkId provided to BrowserAnalytics component</p>
        </div>
      </div>
    );
  }

  const getBrowserIcon = (browser: string) => {
    const browserLower = browser.toLowerCase();
    if (browserLower.includes('chrome')) {
      return <Chrome className="w-5 h-5 text-blue-500" />;
    } else if (browserLower.includes('firefox')) {
      return <Globe className="w-5 h-5 text-orange-500" />;
    } else if (browserLower.includes('safari')) {
      return <Globe className="w-5 h-5 text-blue-400" />;
    } else if (browserLower.includes('edge')) {
      return <Monitor className="w-5 h-5 text-blue-600" />;
    } else {
      return <Monitor className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBrowserColor = (index: number) => {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16'  // Lime
    ];
    return colors[index % colors.length];
  };

  const fetchBrowserData = async () => {
    try {
      setLoading(true);
      console.log('BrowserAnalytics - Fetching browser data for linkId:', linkId);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get date range
      const fromDate = dateRange.from ? dateRange.from.toISOString().split('T')[0] : 
                      subDays(new Date(), 6).toISOString().split('T')[0];
      const toDate = dateRange.to ? dateRange.to.toISOString().split('T')[0] : 
                    new Date().toISOString().split('T')[0];

      console.log('BrowserAnalytics - Date range:', { fromDate, toDate });

      // Fetch clicks data for this specific link or all user's links
      let query = supabase
        .from('clicks')
        .select(`
          browser, 
          browser_type, 
          clicked_at,
          links!inner(
            user_id
          )
        `)
        .eq('links.user_id', user.id)
        .gte('clicked_at', `${fromDate}T00:00:00.000Z`)
        .lte('clicked_at', `${toDate}T23:59:59.999Z`);

      // Filter by specific link if linkId provided
      if (linkId) {
        query = query.eq('link_id', linkId);
      }

      const { data: clicksData, error } = await query;

      if (error) {
        console.error('BrowserAnalytics - Error fetching clicks:', error);
        throw error;
      }

      console.log('BrowserAnalytics - Raw clicks data:', clicksData);

      // Process browser data
      const browserCounts: { [key: string]: number } = {};
      
      clicksData?.forEach(click => {
        const browser = click.browser || click.browser_type || 'Unknown';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      });

      const totalClicks = Object.values(browserCounts).reduce((sum, count) => sum + count, 0);
      
      const processedData = Object.entries(browserCounts)
        .map(([browser, clicks], index) => ({
          browser,
          clicks,
          percentage: totalClicks > 0 ? (clicks / totalClicks) * 100 : 0,
          color: getBrowserColor(index)
        }))
        .sort((a, b) => b.clicks - a.clicks);

      console.log('BrowserAnalytics - Processed data:', {
        browserCounts,
        totalClicks,
        processedData
      });

      setBrowserData(processedData);
    } catch (error) {
      console.error('BrowserAnalytics - Error fetching browser data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrowserData();
  }, [linkId, dateRange]);

  const renderPieChart = () => {
    if (browserData.length === 0) {
      return (
        <div className="w-64 h-64 mx-auto flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No browser data available</p>
          </div>
        </div>
      );
    }

    let cumulativePercentage = 0;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    return (
      <div className="w-64 h-64 mx-auto relative">
        <svg width="200" height="200" className="transform -rotate-90">
          {browserData.map((browser, index) => {
            const startAngle = (cumulativePercentage / 100) * 360;
            const endAngle = ((cumulativePercentage + browser.percentage) / 100) * 360;
            cumulativePercentage += browser.percentage;

            const startAngleRad = (startAngle * Math.PI) / 180;
            const endAngleRad = (endAngle * Math.PI) / 180;

            const x1 = centerX + radius * Math.cos(startAngleRad);
            const y1 = centerY + radius * Math.sin(startAngleRad);
            const x2 = centerX + radius * Math.cos(endAngleRad);
            const y2 = centerY + radius * Math.sin(endAngleRad);

            const largeArcFlag = browser.percentage > 50 ? 1 : 0;

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');

            return (
              <path
                key={browser.browser}
                d={pathData}
                fill={browser.color}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
                title={`${browser.browser}: ${browser.clicks} clicks (${browser.percentage.toFixed(1)}%)`}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Browsers</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading browser data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Browsers</h2>
        <div className="text-sm text-muted-foreground">
          {dateRange.from && dateRange.to && (
            <span>
              {format(dateRange.from, 'MM/dd/yyyy')} - {format(dateRange.to, 'MM/dd/yyyy')}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Browser Distribution</h3>
          {renderPieChart()}
        </Card>

        {/* Top Browsers List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Browsers</h3>
          {browserData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No browser data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {browserData.map((browser, index) => (
                <div key={browser.browser} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: browser.color }}
                    ></div>
                    {getBrowserIcon(browser.browser)}
                    <span className="font-medium">{browser.browser}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{browser.clicks} clicks</div>
                    <div className="text-sm text-muted-foreground">
                      {browser.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Total Summary */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Clicks</span>
                  <div className="text-right">
                    <span className="font-semibold text-lg">
                      {browserData.reduce((sum, browser) => sum + browser.clicks, 0)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">100.0%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BrowserAnalytics;
