import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/types/farm";
import { Loader2 } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  completedTasks?: Set<string>;
  onToggleTask?: (taskId: string) => void;
  loading?: boolean;
}

export const TaskList = ({ tasks, completedTasks = new Set(), onToggleTask, loading }: TaskListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {tasks.map((task) => {
              const isCompleted = completedTasks.has(task.id);
              return (
                <div
                  key={task.id}
                  className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Checkbox 
                    id={task.id} 
                    checked={isCompleted}
                    onCheckedChange={() => onToggleTask?.(task.id)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={task.id}
                      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${
                        isCompleted ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </label>
                    <p className={`text-sm text-muted-foreground mt-1 ${
                      isCompleted ? "line-through" : ""
                    }`}>
                      {task.description}
                    </p>
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No tasks scheduled for today. Enjoy your day! 🌱
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
