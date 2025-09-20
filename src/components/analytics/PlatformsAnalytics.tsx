import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Calendar as CalendarIcon,
  Smartphone as Android,
  Apple,
  Terminal
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PlatformData {
  platform: string;
  count: number;
  percentage: number;
  icon: React.ReactNode;
}

interface PlatformsAnalyticsProps {
  linkId: string;
}

const PlatformsAnalytics = ({ linkId }: PlatformsAnalyticsProps) => {
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 6),
    to: new Date()
  });

  console.log('PlatformsAnalytics - Component rendered with linkId:', linkId);
  
  // Simple test to see if component is rendering
  if (!linkId) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Platforms</h2>
        <div className="text-center py-8 text-muted-foreground">
          <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No linkId provided to PlatformsAnalytics component</p>
        </div>
      </div>
    );
  }

  const getPlatformIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('android')) {
      return <Smartphone className="w-5 h-5 text-green-500" />;
    } else if (platformLower.includes('iphone') || platformLower.includes('ios')) {
      return <Apple className="w-5 h-5 text-gray-600" />;
    } else if (platformLower.includes('mac') || platformLower.includes('macos')) {
      return <Apple className="w-5 h-5 text-gray-600" />;
    } else if (platformLower.includes('linux')) {
      return <Terminal className="w-5 h-5 text-yellow-500" />;
    } else if (platformLower.includes('windows')) {
      return <Monitor className="w-5 h-5 text-blue-500" />;
    } else {
      return <Monitor className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPlatformColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  const fetchPlatformData = async () => {
    if (!linkId) {
      console.log('PlatformsAnalytics - No linkId provided');
      return;
    }
    
    console.log('PlatformsAnalytics - Fetching data for linkId:', linkId);
    setLoading(true);
    try {
      let query = supabase
        .from('clicks')
        .select('os, device_type')
        .eq('link_id', linkId);

      // Apply date filter
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('PlatformsAnalytics - Raw data:', data);
      console.log('PlatformsAnalytics - Data length:', data?.length);
      
      if (!data || data.length === 0) {
        console.log('PlatformsAnalytics - No clicks data found for this link');
        setPlatformData([]);
        setLoading(false);
        return;
      }

      // Process platform data
      const platformCounts: { [key: string]: number } = {};
      
      data?.forEach(click => {
        const platform = click.os || click.device_type || 'Unknown';
        console.log('PlatformsAnalytics - Processing click:', { os: click.os, device_type: click.device_type, platform });
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });

      const total = Object.values(platformCounts).reduce((sum, count) => sum + count, 0);
      
      const processedData = Object.entries(platformCounts)
        .map(([platform, count]) => ({
          platform,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
          icon: getPlatformIcon(platform)
        }))
        .sort((a, b) => b.count - a.count);
      
      console.log('PlatformsAnalytics - Processed data:', processedData);
      console.log('PlatformsAnalytics - Platform counts:', platformCounts);
      
      // Only show real data - no mock data
      setPlatformData(processedData);
    } catch (error) {
      console.error('Error fetching platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, [linkId, dateRange]);

  const totalClicks = platformData.reduce((sum, platform) => sum + platform.count, 0);

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platforms</h2>
          <p className="text-muted-foreground">
            {dateRange.from && dateRange.to 
              ? `${format(dateRange.from, 'MM/dd/yyyy')} - ${format(dateRange.to, 'MM/dd/yyyy')}`
              : 'Select date range'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading platform data...</p>
          </div>
        </div>
      ) : platformData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Platform Distribution</h3>
            <div className="flex items-center justify-center h-64">
              <div className="relative w-48 h-48">
                {/* Simple pie chart using CSS */}
                <div className="relative w-full h-full">
                  {platformData.map((platform, index) => {
                    const startAngle = platformData.slice(0, index).reduce((sum, p) => sum + (p.percentage / 100) * 360, 0);
                    const endAngle = startAngle + (platform.percentage / 100) * 360;
                    
                    return (
                      <div
                        key={platform.platform}
                        className="absolute inset-0"
                        style={{
                          background: `conic-gradient(from ${startAngle}deg, ${getPlatformColor(index)} ${startAngle}deg ${endAngle}deg, transparent ${endAngle}deg)`
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {platformData.map((platform, index) => (
                <div key={platform.platform} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getPlatformColor(index)}`}></div>
                  <span className="text-sm">{platform.platform}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Platforms List */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Platforms</h3>
            <div className="space-y-3">
              {platformData.map((platform, index) => (
                <div key={platform.platform} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {platform.icon}
                    <div>
                      <p className="font-medium">{platform.platform}</p>
                      <p className="text-sm text-muted-foreground">
                        {platform.count} clicks ({platform.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{platform.count}</div>
                    <div className="text-sm text-muted-foreground">
                      {platform.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total Clicks</span>
                <span className="font-semibold">{totalClicks}</span>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-6">
          <div className="text-center py-12">
            <Monitor className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Platform Data</h3>
            <p className="text-muted-foreground">
              No platform data available for the selected date range
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlatformsAnalytics;
