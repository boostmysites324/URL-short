import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Smartphone, Monitor, Globe, TrendingUp } from 'lucide-react';
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
}

interface RecentActivityProps {
  linkId: string;
  isOpen: boolean;
  onClose: () => void;
}

const RecentActivity = ({ linkId, isOpen, onClose }: RecentActivityProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && linkId) {
      fetchRecentActivity();
    }
  }, [isOpen, linkId]);

  const fetchRecentActivity = async () => {
    setLoading(true);
    try {
      // Fetch actual click data from database
      const { data: clicksData, error } = await supabase
        .from('clicks')
        .select('*')
        .eq('link_id', linkId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching recent activity:', error);
        setActivities([]);
        return;
      }

      // Map database fields to component interface
      const mappedActivities: ActivityItem[] = (clicksData || []).map((click: any) => ({
        id: click.id,
        link_id: click.link_id,
        ip_address: click.ip_address || '',
        user_agent: click.user_agent || '',
        country: click.country_name || click.country || 'Unknown',
        city: click.city || 'Unknown',
        device_type: click.device_type || 'unknown',
        browser: click.browser || 'Unknown',
        os: click.os || 'Unknown',
        referrer: click.referer || 'Direct',
        created_at: click.created_at || click.clicked_at || new Date().toISOString()
      }));
      
      setActivities(mappedActivities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getBrowserColor = (browser: string) => {
    switch (browser.toLowerCase()) {
      case 'chrome':
        return 'bg-blue-100 text-blue-800';
      case 'firefox':
        return 'bg-orange-100 text-orange-800';
      case 'safari':
        return 'bg-gray-100 text-gray-800';
      case 'edge':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-card border-card-border">
        <div className="p-6 border-b border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-card-foreground">Recent Activity</h3>
              <p className="text-sm text-muted-foreground mt-1">Track clicks and user interactions</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recent activity yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="bg-surface-secondary rounded-lg p-4 hover:bg-surface-secondary/80 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
                        {getDeviceIcon(activity.device_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-card-foreground">{(() => {
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
                          })()}</span>
                          <Badge variant="outline" className="text-xs">
                            {activity.device_type}
                          </Badge>
                          <Badge className={`text-xs ${getBrowserColor(activity.browser)}`}>
                            {activity.browser}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{(() => {
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
                            })()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(activity.created_at)}</span>
                          </div>
                        </div>
                        {activity.referrer && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Referrer: {activity.referrer}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default RecentActivity;