import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, TrendingUp, MousePointer, Users } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";

const TrafficOverview = () => {
  const [startDate, setStartDate] = useState<Date>(new Date(2025, 6, 15)); // July 15, 2025
  const [endDate, setEndDate] = useState<Date>(new Date(2025, 6, 29)); // July 29, 2025
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const { analytics, loading } = useAnalytics(startDate, endDate);

  const formatDateRange = (start: Date, end: Date) => {
    return `${format(start, "MM/dd/yyyy")} - ${format(end, "MM/dd/yyyy")}`;
  };

  const maxClicks = Math.max(...analytics.chartData.map(d => d.clicks), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-card-foreground bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            Traffic Overview
          </h2>
          <p className="text-muted-foreground mt-1">Monitor your link performance in real-time</p>
        </div>
        
        {/* Working Date Range Picker */}
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="flex items-center space-x-2 w-fit hover-lift hover:border-primary transition-all duration-300 group"
            >
              <CalendarDays className="w-4 h-4 group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">{formatDateRange(startDate, endDate)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-card-border shadow-lg z-50" align="start">
            <div className="p-4 space-y-4">
              <div className="text-sm font-medium text-card-foreground">Select Date Range</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Date</label>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setIsDatePickerOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => setIsDatePickerOpen(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 card-gradient shadow-card border-card-border hover-lift group cursor-pointer animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Total Clicks
              </p>
              <p className="text-4xl font-bold text-card-foreground mt-2 group-hover:text-primary transition-colors">
                1,192
              </p>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-success mr-1" />
                <span className="text-success font-medium">+12.5%</span>
                <span className="text-muted-foreground ml-1">from last month</span>
              </div>
            </div>
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
              <MousePointer className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </Card>

        <Card className="p-6 card-gradient shadow-card border-card-border hover-lift group cursor-pointer animate-slide-up" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-success transition-colors">
                Clicks (Current Period)
              </p>
              <p className="text-4xl font-bold text-card-foreground mt-2 group-hover:text-success transition-colors">
                361
              </p>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-success mr-1" />
                <span className="text-success font-medium">+8.2%</span>
                <span className="text-muted-foreground ml-1">vs last period</span>
              </div>
            </div>
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-success/20 to-success/10 rounded-2xl group-hover:from-success/30 group-hover:to-success/20 transition-all duration-300">
              <TrendingUp className="w-8 h-8 text-success group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </Card>

        <Card className="p-6 card-gradient shadow-card border-card-border hover-lift group cursor-pointer animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-warning transition-colors">
                Clicks (Today)
              </p>
              <p className="text-4xl font-bold text-card-foreground mt-2 group-hover:text-warning transition-colors">
                8
              </p>
              <div className="flex items-center mt-2 text-sm">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse-custom mr-2"></div>
                <span className="text-muted-foreground">Live tracking</span>
              </div>
            </div>
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-warning/20 to-warning/10 rounded-2xl group-hover:from-warning/30 group-hover:to-warning/20 transition-all duration-300">
              <Users className="w-8 h-8 text-warning group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </Card>
      </div>

      {/* Enhanced Chart */}
      <Card className="p-6 card-gradient shadow-card border-card-border hover-glow animate-slide-up" style={{animationDelay: '0.3s'}}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-card-foreground">Daily Click Activity</h3>
              <p className="text-sm text-muted-foreground mt-1">Interactive chart showing daily performance</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground">Clicks</span>
              </div>
            </div>
          </div>
          
          <div className="relative bg-surface-secondary/30 rounded-lg p-4">
            <div className="flex items-end justify-between h-72 space-x-2">
              {chartData.map((data, index) => {
                const height = (data.clicks / maxClicks) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group relative">
                    <div 
                      className="w-full bg-gradient-to-t from-primary to-primary-light hover:from-primary-dark hover:to-primary rounded-t-lg relative cursor-pointer chart-bar shadow-md"
                      style={{ 
                        height: `${height}%`,
                        minHeight: '8px'
                      }}
                    >
                      {/* Enhanced Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-card border border-card-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-20 animate-scale-in">
                        <div className="text-sm font-semibold text-card-foreground">{data.date}</div>
                        <div className="text-sm text-primary font-medium">{data.clicks} clicks</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-card border-r border-b border-card-border rotate-45"></div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground mt-3 font-medium group-hover:text-card-foreground transition-colors">
                      {data.date.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground py-4">
              <span>{maxClicks}</span>
              <span>{Math.round(maxClicks * 0.75)}</span>
              <span>{Math.round(maxClicks * 0.5)}</span>
              <span>{Math.round(maxClicks * 0.25)}</span>
              <span>0</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TrafficOverview;