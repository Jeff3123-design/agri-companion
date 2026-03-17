import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { maizeTasks } from "@/data/maizeTasks";

interface DayCompletion {
  day: number;
  completedCount: number;
  totalCount: number;
}

interface ProgressChartsProps {
  completions: DayCompletion[];
  currentDay: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];

export const ProgressCharts = ({ completions, currentDay }: ProgressChartsProps) => {
  const stageProgress = useMemo(() => {
    const stages: Record<string, { total: number; completed: number }> = {};
    
    completions.forEach((day) => {
      const stage = maizeTasks.find((t) => t.day === day.day)?.stage;
      if (stage) {
        if (!stages[stage]) {
          stages[stage] = { total: 0, completed: 0 };
        }
        stages[stage].total += day.totalCount;
        stages[stage].completed += day.completedCount;
      }
    });

    return Object.entries(stages).map(([name, data]) => ({
      name: name.split(" ").slice(0, 2).join(" "),
      completed: data.completed,
      remaining: data.total - data.completed,
      percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));
  }, [completions]);

  const dailyTrend = useMemo(() => {
    return completions
      .filter((d) => d.day <= currentDay && d.totalCount > 0)
      .slice(-14)
      .map((d) => ({
        day: `Day ${d.day}`,
        completion: d.totalCount > 0 ? Math.round((d.completedCount / d.totalCount) * 100) : 0,
        tasks: d.completedCount,
      }));
  }, [completions, currentDay]);

  const overallStats = useMemo(() => {
    const completed = completions.filter(
      (d) => d.totalCount > 0 && d.completedCount === d.totalCount && d.day <= currentDay
    ).length;
    const daysWithTasks = completions.filter((d) => d.totalCount > 0 && d.day <= currentDay).length;
    
    return [
      { name: "Completed", value: completed },
      { name: "Remaining", value: Math.max(0, daysWithTasks - completed) },
    ];
  }, [completions, currentDay]);

  const cumulativeProgress = useMemo(() => {
    let cumCompleted = 0;
    let cumTotal = 0;
    
    return completions
      .filter((d) => d.day <= currentDay)
      .map((d) => {
        cumCompleted += d.completedCount;
        cumTotal += d.totalCount;
        return {
          day: d.day,
          progress: cumTotal > 0 ? Math.round((cumCompleted / cumTotal) * 100) : 0,
        };
      })
      .filter((_, i, arr) => i === 0 || i === arr.length - 1 || i % 7 === 0);
  }, [completions, currentDay]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} className="text-muted-foreground" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Area
                type="monotone"
                dataKey="completion"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary)/0.2)"
                name="Completion %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={overallStats}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {overallStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stageProgress} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="% Complete" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cumulative Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cumulativeProgress}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Line
                type="monotone"
                dataKey="progress"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
                name="Progress %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
