import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, TrendingUp, MousePointer, Users } from "lucide-react";
import { useState } from "react";

const TrafficOverview = () => {
  const [dateRange, setDateRange] = useState("07/15/2025 - 07/29/2025");

  // Sample chart data
  const chartData = [
    { date: "15 July", clicks: 17 },
    { date: "16 July", clicks: 39 },
    { date: "17 July", clicks: 30 },
    { date: "18 July", clicks: 25 },
    { date: "19 July", clicks: 23 },
    { date: "20 July", clicks: 20 },
    { date: "21 July", clicks: 21 },
    { date: "22 July", clicks: 22 },
    { date: "23 July", clicks: 20 },
    { date: "24 July", clicks: 28 },
    { date: "25 July", clicks: 28 },
    { date: "26 July", clicks: 36 },
    { date: "27 July", clicks: 12 },
    { date: "28 July", clicks: 32 },
    { date: "29 July", clicks: 8 }
  ];

  const maxClicks = Math.max(...chartData.map(d => d.clicks));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-card-foreground">Traffic Overview</h2>
        <Button 
          variant="outline" 
          className="flex items-center space-x-2 w-fit"
          onClick={() => setDateRange("07/15/2025 - 07/29/2025")}
        >
          <CalendarDays className="w-4 h-4" />
          <span className="text-sm">{dateRange}</span>
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 card-gradient shadow-card border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
              <p className="text-3xl font-bold text-card-foreground mt-1">1,192</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
              <MousePointer className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 card-gradient shadow-card border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Clicks (Current Period)</p>
              <p className="text-3xl font-bold text-card-foreground mt-1">361</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6 card-gradient shadow-card border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Clicks (Today)</p>
              <p className="text-3xl font-bold text-card-foreground mt-1">8</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-lg">
              <Users className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6 card-gradient shadow-card border-card-border">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-card-foreground">Daily Click Activity</h3>
          
          <div className="relative">
            <div className="flex items-end justify-between h-64 space-x-1">
              {chartData.map((data, index) => {
                const height = (data.clicks / maxClicks) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div 
                      className="w-full bg-primary hover:bg-primary-dark transition-colors rounded-t-sm relative cursor-pointer"
                      style={{ height: `${height}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {data.date}: {data.clicks} clicks
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground mt-2 transform rotate-45 origin-left">
                      {data.date.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TrafficOverview;