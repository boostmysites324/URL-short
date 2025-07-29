import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ExternalLink, Globe, Monitor, Smartphone } from "lucide-react";

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
    <Card className="card-gradient shadow-card border-card-border">
      <div className="p-6 border-b border-card-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-card-foreground">Recent Activity</h3>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="divide-y divide-card-border max-h-[600px] overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity.id} className="p-4 hover:bg-surface-secondary/50 transition-colors">
            <div className="space-y-3">
              {/* URL and Link */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <a 
                    href={activity.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark text-sm font-medium truncate flex items-center space-x-1"
                  >
                    <span className="truncate">{activity.url}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground truncate pl-4">{activity.shortUrl}</p>
              </div>

              {/* Location and Device Info */}
              <div className="flex items-center space-x-4 text-xs pl-4">
                <div className="flex items-center space-x-1">
                  <span className="text-base">{activity.flag}</span>
                  <span className="text-muted-foreground">{activity.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {getDeviceIcon(activity.device)}
                  <span className="text-muted-foreground">{activity.device}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                  <span className="text-muted-foreground">{activity.browser}</span>
                </div>
              </div>

              {/* Website */}
              <div className="flex items-center space-x-2 pl-4">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <a 
                  href={activity.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark text-xs"
                >
                  {activity.website}
                </a>
                <span className="text-xs text-muted-foreground">{activity.language}</span>
              </div>

              {/* Stats */}
              <div className="flex items-center space-x-1 text-xs pl-4">
                <span className="text-purple-600 font-medium">⇒ {activity.uniqueClicks} Unique Clicks</span>
                <span className="text-red-600 font-medium">- {activity.yesterdayClicks} Yesterday Clicks</span>
                <span className="text-success font-medium">- {activity.todayClicks} Today Clicks</span>
              </div>

              {/* Time */}
              <p className="text-xs text-muted-foreground pl-4">{activity.timeAgo}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentActivity;