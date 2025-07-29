import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ExternalLink, Globe, Monitor, Smartphone, Activity, MapPin } from "lucide-react";

const RecentActivity = () => {
  const activities = [
    {
      id: 1,
      url: "https://wa.me/919897879056?tex...",
      shortUrl: "https://b2u.io/Tiger",
      location: "Somewhere from India",
      device: "Android",
      browser: "Chrome",
      website: "https://tiger365id.in",
      language: "EN",
      uniqueClicks: 1017,
      yesterdayClicks: 31,
      todayClicks: 8,
      timeAgo: "30 minutes ago",
      flag: "🇮🇳"
    },
    {
      id: 2,
      url: "https://wa.me/919897879056?tex...",
      shortUrl: "https://b2u.io/Tiger",
      location: "Hyderabad, India",
      device: "Linux",
      browser: "Chrome",
      website: "https://tiger365id.in",
      language: "EN",
      uniqueClicks: 1017,
      yesterdayClicks: 31,
      todayClicks: 8,
      timeAgo: "2 hours ago",
      flag: "🇮🇳"
    },
    {
      id: 3,
      url: "https://wa.me/919897879056?tex...",
      shortUrl: "https://b2u.io/Tiger",
      location: "Bengaluru, India",
      device: "Android",
      browser: "Chrome",
      website: "https://tiger365id.in",
      language: "EN",
      uniqueClicks: 1017,
      yesterdayClicks: 31,
      todayClicks: 8,
      timeAgo: "2 hours ago",
      flag: "🇮🇳"
    },
    {
      id: 4,
      url: "https://wa.me/919897879056?tex...",
      shortUrl: "https://b2u.io/Tiger",
      location: "Bengaluru, India",
      device: "Android",
      browser: "Chrome",
      website: "https://tiger365id.in",
      language: "EN",
      uniqueClicks: 1017,
      yesterdayClicks: 31,
      todayClicks: 8,
      timeAgo: "3 hours ago",
      flag: "🇮🇳"
    },
    {
      id: 5,
      url: "https://wa.me/919897879056?tex...",
      shortUrl: "https://b2u.io/Tiger",
      location: "Bengaluru, India",
      device: "Android",
      browser: "Chrome",
      website: "https://tiger365id.in",
      language: "EN",
      uniqueClicks: 1017,
      yesterdayClicks: 31,
      todayClicks: 8,
      timeAgo: "4 hours ago",
      flag: "🇮🇳"
    }
  ];

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'android':
        return <Smartphone className="w-3 h-3 text-success" />;
      case 'linux':
        return <Monitor className="w-3 h-3 text-primary" />;
      default:
        return <Monitor className="w-3 h-3 text-muted-foreground" />;
    }
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
        {activities.map((activity, index) => (
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
                      href={activity.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark font-semibold text-sm truncate flex items-center space-x-2 group-hover:underline transition-all duration-300"
                    >
                      <span className="truncate">{activity.url}</span>
                      <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    </a>
                    <p className="text-xs text-muted-foreground truncate mt-1 group-hover:text-card-foreground transition-colors">
                      {activity.shortUrl}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Location and Device Info */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center space-x-2 bg-surface-secondary/50 rounded-lg px-3 py-1.5">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-lg">{activity.flag}</span>
                  <span className="text-muted-foreground font-medium">{activity.location}</span>
                </div>
                
                <div className="flex items-center space-x-2 bg-surface-secondary/50 rounded-lg px-3 py-1.5">
                  {getDeviceIcon(activity.device)}
                  <span className="text-muted-foreground font-medium">{activity.device}</span>
                </div>
                
                <div className="flex items-center space-x-2 bg-surface-secondary/50 rounded-lg px-3 py-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center shadow-sm">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                  <span className="text-muted-foreground font-medium">{activity.browser}</span>
                </div>
              </div>

              {/* Enhanced Website Info */}
              <div className="flex items-center space-x-3 bg-gradient-to-r from-surface-secondary/30 to-transparent rounded-lg px-3 py-2">
                <Globe className="w-4 h-4 text-primary" />
                <a 
                  href={activity.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark text-sm font-medium group-hover:underline transition-all duration-300"
                >
                  {activity.website}
                </a>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                  {activity.language}
                </span>
              </div>

              {/* Enhanced Stats with Better Visual Hierarchy */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center space-x-2 bg-purple-500/10 rounded-lg px-3 py-1.5">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-purple-600 font-bold">{activity.uniqueClicks}</span>
                  <span className="text-purple-600/70 text-xs">Unique</span>
                </div>
                
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
                  <span>{activity.timeAgo}</span>
                </p>
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                  <div className="w-1 h-1 bg-primary/60 rounded-full"></div>
                  <div className="w-1 h-1 bg-primary/30 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentActivity;