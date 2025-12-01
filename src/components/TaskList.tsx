import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DayTask } from "@/types/farm";

interface TaskListProps {
  tasks: DayTask[];
  onToggleTask: (day: number) => void;
}

export const TaskList = ({ tasks, onToggleTask }: TaskListProps) => {
  const todaysTasks = tasks.filter(t => !t.completed).slice(0, 5);

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4 text-foreground">Today's Tasks</h3>
      <div className="space-y-3">
        {todaysTasks.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            All tasks completed! 🎉
          </p>
        ) : (
          todaysTasks.map((task) => (
            <div key={task.day} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="text-primary">Day {task.day}</span>
                <span>•</span>
                <span>{task.stage}</span>
              </div>
              {task.tasks.map((taskItem, idx) => (
                <button
                  key={idx}
                  onClick={() => onToggleTask(task.day)}
                  className="flex items-start gap-3 w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  <span className={task.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                    {taskItem}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
