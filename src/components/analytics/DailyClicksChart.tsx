import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useMemo, useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, TrendingUp, Users, BarChart3 } from "lucide-react";

type DailyClicksChartProps = {
  from: Date;
  to: Date;
  linkId?: string;
  showMetrics?: boolean;
};

type ChartDataPoint = {
  date: string;
  clicks: number;
  unique: number;
  formattedDate: string;
};

const chartConfig = {
  clicks: {
    label: "Total Clicks",
    color: "hsl(217 91% 60%)",
  },
};

export default function DailyClicksChart({ from, to, linkId, showMetrics = true }: DailyClicksChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  // KPI metrics
  const [totalAllTime, setTotalAllTime] = useState(0);
  const [totalInPeriod, setTotalInPeriod] = useState(0);
  const [totalToday, setTotalToday] = useState(0);

  const rangeLabel = useMemo(() => {
    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${
        d.getFullYear()
      }`;
    return `${fmt(from)} – ${fmt(to)}`;
  }, [from, to]);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);

        const startDate = startOfDay(from);
        const endDate = endOfDay(to);

        // Calculate total days in range
        const totalDays = Math.max(
          1,
          Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
        );

        let clicksData: any[] | null = null;

        if (linkId) {
          // Per-link chart
          const { data, error } = await supabase
            .from('clicks')
            .select('id, ip_address, created_at')
            .eq('link_id', linkId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
          if (error) throw error;
          clicksData = data;
        } else {
          // Global chart across all user's links
          const {
            data: { user }
          } = await supabase.auth.getUser();
          if (!user) {
            setChartData([]);
            setTotalAllTime(0);
            setTotalInPeriod(0);
            setTotalToday(0);
            setLoading(false);
            return;
          }

          // Get user's link ids
          const { data: links, error: linksError } = await supabase
            .from('links')
            .select('id')
            .eq('user_id', user.id);
          if (linksError) throw linksError;

          const linkIds = (links || []).map(l => l.id);
          if (linkIds.length === 0) {
            setChartData([]);
            setTotalAllTime(0);
            setTotalInPeriod(0);
            setTotalToday(0);
            setLoading(false);
            return;
          }

          const { data, error } = await supabase
            .from('clicks')
            .select('id, ip_address, created_at, link_id')
            .in('link_id', linkIds)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
          if (error) throw error;
          clicksData = data;
        }

        // Generate chart data for each day in range
        const dataPoints: ChartDataPoint[] = Array.from({ length: totalDays }, (_, i) => {
          const currentDate = addDays(startDate, i);
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          // Use shorter format for mobile: "29 Oct" instead of "29 October"
          const formattedDate = format(currentDate, 'dd MMM');

          const dayClicks = (clicksData || []).filter(click => (click.created_at || '').startsWith(dateStr));
          const uniqueIPs = new Set(dayClicks.map(click => click.ip_address).filter(Boolean));

          return {
            date: dateStr,
            clicks: dayClicks.length,
            unique: uniqueIPs.size,
            formattedDate
          };
        });

        // Totals in period
        const periodCount = (clicksData || []).length;

        // Today's count
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const todayCount = (clicksData || []).filter(c => (c.created_at || '').startsWith(todayStr)).length;

        // All-time count
        let allTimeCount = 0;
        if (linkId) {
          const headRes: any = await (supabase as any)
            .from('clicks')
            .select('id', { count: 'exact', head: true })
            .eq('link_id', linkId);
          allTimeCount = headRes?.count ?? periodCount;
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: linkRows } = await (supabase as any)
              .from('links')
              .select('id')
              .eq('user_id', user.id);
            const ids = (linkRows || []).map((l: any) => l.id);
            if (ids.length > 0) {
              const headRes: any = await (supabase as any)
                .from('clicks')
                .select('id', { count: 'exact', head: true })
                .in('link_id', ids);
              allTimeCount = headRes?.count ?? periodCount;
            }
          }
        }

        setChartData(dataPoints);
        setTotalInPeriod(periodCount);
        setTotalToday(todayCount);
        setTotalAllTime(allTimeCount);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setChartData([]);
        setTotalAllTime(0);
        setTotalInPeriod(0);
        setTotalToday(0);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [from, to, linkId]);

  if (loading) {
    return (
      <Card className="p-4 md:p-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Daily Clicks</h3>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          <div className="mt-4 flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const maxClicks = Math.max(...chartData.map(d => d.clicks), 0);
  const yAxisMax = Math.max(10, Math.ceil(maxClicks * 1.1));

  return (
    <Card className="p-4 md:p-6 shadow-card border-card-border hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-card-foreground">Daily Clicks</h3>
              <p className="text-sm text-muted-foreground">{rangeLabel}</p>
            </div>
          </div>
          {showMetrics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
              <div className="rounded-md border border-card-border px-3 py-2">
                <div className="text-xs text-muted-foreground">Total Clicks</div>
                <div className="text-lg font-semibold">{totalAllTime}</div>
              </div>
              <div className="rounded-md border border-card-border px-3 py-2">
                <div className="text-xs text-muted-foreground">Clicks (Current Period)</div>
                <div className="text-lg font-semibold">{totalInPeriod}</div>
              </div>
              <div className="rounded-md border border-card-border px-3 py-2">
                <div className="text-xs text-muted-foreground">Clicks (Today)</div>
                <div className="text-lg font-semibold">{totalToday}</div>
              </div>
            </div>
          )}
        </div>

        {chartData.length === 0 ? (
          <div className="mt-4 grid place-items-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No click data available for this period</p>
            </div>
          </div>
        ) : (
          <div className="h-64 sm:h-80 w-full overflow-x-auto">
            <ChartContainer config={chartConfig} className="h-full w-full min-w-[500px] sm:min-w-0">
              <BarChart 
                data={chartData} 
                margin={{ 
                  top: 20, 
                  right: 10, 
                  left: 0, 
                  bottom: 60 
                }}
                className="sm:mx-4"
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" stroke="hsl(var(--muted-foreground))" />
                <XAxis 
                  dataKey="formattedDate" 
                  tick={{ 
                    fontSize: 10, 
                    fill: 'hsl(var(--muted-foreground))',
                    angle: -45,
                    textAnchor: 'end',
                    height: 60
                  }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                  height={60}
                />
                <YAxis 
                  domain={[0, yAxisMax]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  tickCount={6}
                  width={30}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value) => [value, 'Clicks']}
                    labelFormatter={(label) => `Date: ${label}`}
                    className="bg-card border border-card-border shadow-lg rounded-lg"
                  />}
                />
                <Bar
                  dataKey="clicks"
                  fill="hsl(217 91% 60%)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </div>
    </Card>
  );
}


