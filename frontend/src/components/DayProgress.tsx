import { Progress } from "@/components/ui/progress";
import { Sprout, Leaf, Wheat } from "lucide-react";

interface DayProgressProps {
  currentDay: number;
  totalDays: number;
}

export const DayProgress = ({ currentDay, totalDays }: DayProgressProps) => {
  const percentage = (currentDay / totalDays) * 100;
  
  const getStage = () => {
    if (currentDay <= 30) return { name: "Germination & Seedling", icon: Sprout, color: "text-green-500" };
    if (currentDay <= 60) return { name: "Vegetative Growth", icon: Leaf, color: "text-green-600" };
    if (currentDay <= 90) return { name: "Tasseling & Silking", icon: Wheat, color: "text-yellow-600" };
    return { name: "Grain Fill & Maturity", icon: Wheat, color: "text-amber-600" };
  };

  const stage = getStage();
  const Icon = stage.icon;

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className={`w-6 h-6 ${stage.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Day {currentDay} of {totalDays}</h3>
            <p className="text-sm text-muted-foreground">{stage.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{Math.round(percentage)}%</p>
          <p className="text-xs text-muted-foreground">Complete</p>
        </div>
      </div>
      <Progress value={percentage} className="h-3" />
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {totalDays - currentDay} days until harvest
      </p>
    </div>
  );
};
