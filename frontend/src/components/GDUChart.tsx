import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, ReferenceLine, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { GDU_STAGES } from "@/lib/gdu";
import { DailyGDURecord } from "@/hooks/useGDUSession";
import { format } from "date-fns";

interface GDUChartProps {
  dailyRecords: DailyGDURecord[];
  accumulatedGdu: number;
}

const chartConfig = {
  gdu: {
    label: "Accumulated GDU",
    color: "hsl(var(--primary))",
  },
};

export const GDUChart = ({ dailyRecords, accumulatedGdu }: GDUChartProps) => {
  const chartData = useMemo(() => {
    if (dailyRecords.length === 0) return [];

    // Sort by date and calculate cumulative GDU
    const sorted = [...dailyRecords].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let cumulative = 0;
    return sorted.map((record) => {
      cumulative += Number(record.gdu);
      return {
        date: record.date,
        dateLabel: format(new Date(record.date), "MMM d"),
        dailyGdu: Number(record.gdu),
        accumulatedGdu: cumulative,
        tempMax: record.temp_max,
        tempMin: record.temp_min,
      };
    });
  }, [dailyRecords]);

  // Get stage markers for reference lines
  const stageMarkers = useMemo(() => {
    return GDU_STAGES.filter(stage => 
      stage.minGdu <= accumulatedGdu + 500 && stage.minGdu > 0
    ).map(stage => ({
      value: stage.minGdu,
      label: stage.stage,
      name: stage.name,
    }));
  }, [accumulatedGdu]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            GDU Accumulation Chart
          </CardTitle>
          <CardDescription>Track your crop's heat unit accumulation over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No temperature data recorded yet. Start recording daily temperatures to see the chart.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          GDU Accumulation Chart
        </CardTitle>
        <CardDescription>
          Accumulated GDU over time with growth stage markers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gduGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, item) => {
                      const payload = item.payload;
                      return (
                        <div className="space-y-1">
                          <p className="font-medium">Accumulated: {payload.accumulatedGdu.toFixed(1)} GDU</p>
                          <p className="text-sm text-muted-foreground">Daily: +{payload.dailyGdu.toFixed(1)} GDU</p>
                          {payload.tempMax && payload.tempMin && (
                            <p className="text-sm text-muted-foreground">
                              Temp: {payload.tempMax}°C / {payload.tempMin}°C
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                }
              />
              {stageMarkers.map((marker) => (
                <ReferenceLine 
                  key={marker.label}
                  y={marker.value} 
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                  label={{
                    value: marker.label,
                    position: "right",
                    fontSize: 10,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
              ))}
              <Area
                type="monotone"
                dataKey="accumulatedGdu"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#gduGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Stage Legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          {stageMarkers.slice(0, 6).map((marker) => (
            <div 
              key={marker.label}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted"
            >
              <span className="font-medium">{marker.label}</span>
              <span className="text-muted-foreground">({marker.value} GDU)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
