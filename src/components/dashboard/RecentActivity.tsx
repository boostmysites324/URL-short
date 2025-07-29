import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ExternalLink, Globe, Monitor, Smartphone, Activity, MapPin } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { format } from "date-fns";

const RecentActivity = () => {
  const { recentActivity, loading } = useAnalytics();

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'android':
        return <Smartphone className="w-3 h-3 text-success" />;
      case 'linux':
        return <Monitor className="w-3 h-3 text-primary" />;
      case 'desktop':
        return <Monitor className="w-3 h-3 text-primary" />;
      case 'mobile':
        return <Smartphone className="w-3 h-3 text-success" />;
      case 'tablet':
        return <Smartphone className="w-3 h-3 text-warning" />;
      default:
        return <Monitor className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getBrowserIcon = (browser: string) => {
    const browserColors = {
      chrome: 'bg-green-500',
      firefox: 'bg-orange-500',
      safari: 'bg-blue-500',
      edge: 'bg-blue-600',
      opera: 'bg-red-500',
      whatsapp: 'bg-green-600',
      telegram: 'bg-blue-400',
      other: 'bg-gray-500'
    };
    
    const color = browserColors[browser.toLowerCase() as keyof typeof browserColors] || browserColors.other;
    
    return (
      <div className={`w-3 h-3 rounded-full ${color} flex items-center justify-center shadow-sm`}>
        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
      </div>
    );
  };

  const getCountryFlag = (countryCode: string) => {
    const flags: { [key: string]: string } = {
      'US': '🇺🇸',
      'IN': '🇮🇳',
      'GB': '🇬🇧',
      'CA': '🇨🇦',
      'AU': '🇦🇺',
      'DE': '🇩🇪',
      'FR': '🇫🇷',
      'BR': '🇧🇷',
      'JP': '🇯🇵',
      'CN': '🇨🇳'
    };
    return flags[countryCode] || '🌍';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const clickTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - clickTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return format(clickTime, 'MMM d, yyyy');
  };

  return (
    <Card className="card-gradient shadow-card border-card-border hover-glow animate-slide-up">
      <div className="p-6 border-b border-card-border bg-gradient-to-r from-transparent to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-card-foreground">Recent Activity</h3>
              <p className="text-sm text-muted-foreground">Live link interaction tracking</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="hover-lift">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="divide-y divide-card-border max-h-[700px] overflow-y-auto">
        {recentActivity.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recent activity yet. Short some links to see activity here!</p>
          </div>
        ) : (
          recentActivity.map((activity, index) => (
            <div 
              key={activity.id} 
              className="p-5 hover:bg-surface-secondary/50 transition-all duration-300 group interactive-card animate-fade-in"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="space-y-4">
                {/* Enhanced URL and Link Section */}
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-3 h-3 bg-success rounded-full animate-pulse-custom shadow-sm"></div>
                      <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                        Live
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <a 
                        href={activity.original_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-dark font-semibold text-sm truncate flex items-center space-x-2 group-hover:underline transition-all duration-300"
                      >
                        <span className="truncate">{activity.original_url}</span>
                        <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      </a>
                      <p className="text-xs text-muted-foreground truncate mt-1 group-hover:text-card-foreground transition-colors">
                        {activity.short_url}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enhanced Location and Device Info */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center space-x-2 bg-surface-secondary/50 rounded-lg px-3 py-1.5">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-lg">{getCountryFlag(activity.country)}</span>
                    <span className="text-muted-foreground font-medium">{activity.city}, {activity.country_name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-surface-secondary/50 rounded-lg px-3 py-1.5">
                    {getDeviceIcon(activity.device_type)}
                    <span className="text-muted-foreground font-medium capitalize">{activity.device_type}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-surface-secondary/50 rounded-lg px-3 py-1.5">
                    {getBrowserIcon(activity.browser_type)}
                    <span className="text-muted-foreground font-medium capitalize">{activity.browser_type}</span>
                  </div>

                  <div className="flex items-center space-x-2 bg-surface-secondary/50 rounded-lg px-3 py-1.5">
                    <Monitor className="w-3 h-3 text-blue-500" />
                    <span className="text-muted-foreground font-medium capitalize">{activity.os_type}</span>
                  </div>
                </div>

                {/* Enhanced Stats with Better Visual Hierarchy */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center space-x-2 bg-red-500/10 rounded-lg px-3 py-1.5">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-600 font-bold">{activity.yesterdayClicks}</span>
                    <span className="text-red-600/70 text-xs">Yesterday</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-success/10 rounded-lg px-3 py-1.5">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span className="text-success font-bold">{activity.todayClicks}</span>
                    <span className="text-success/70 text-xs">Today</span>
                  </div>
                </div>

                {/* Enhanced Time with Better Styling */}
                <div className="flex items-center justify-between pt-2 border-t border-card-border/50">
                  <p className="text-xs text-muted-foreground flex items-center space-x-1">
                    <Activity className="w-3 h-3" />
                    <span>{formatTimeAgo(activity.clicked_at)}</span>
                  </p>
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-primary rounded-full"></div>
                    <div className="w-1 h-1 bg-primary/60 rounded-full"></div>
                    <div className="w-1 h-1 bg-primary/30 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default RecentActivity;