import { useState, useEffect } from "react";
import { DayProgress } from "@/components/DayProgress";
import { WeatherWidget } from "@/components/WeatherWidget";
import { TaskList } from "@/components/TaskList";
import { Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { maizeTasks } from "@/data/maizeTasks";
import { DayTask } from "@/types/farm";
import farmHero from "@/assets/farm-hero.jpg";

const Dashboard = () => {
  const [currentDay, setCurrentDay] = useState(() => {
    const saved = localStorage.getItem('farmCurrentDay');
    return saved ? parseInt(saved) : 1;
  });
  
  const [tasks, setTasks] = useState<DayTask[]>(() => {
    const saved = localStorage.getItem('farmTasks');
    return saved ? JSON.parse(saved) : maizeTasks;
  });

  useEffect(() => {
    localStorage.setItem('farmCurrentDay', currentDay.toString());
  }, [currentDay]);

  useEffect(() => {
    localStorage.setItem('farmTasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleToggleTask = (day: number) => {
    setTasks(tasks.map(task => 
      task.day === day ? { ...task, completed: !task.completed } : task
    ));
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 md:pt-20">
      {/* Hero Section */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img 
          src={farmHero} 
          alt="Farm field" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="container mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-accent">AI-Powered Assistant</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Farm Buddy
            </h1>
            <p className="text-muted-foreground">Your intelligent maize farming companion</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Progress Card */}
        <DayProgress currentDay={currentDay} totalDays={120} />

        {/* Weather & Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <WeatherWidget />
          
          <div className="bg-gradient-earth rounded-xl p-6 shadow-card border border-border">
            <h3 className="font-semibold text-lg mb-4 text-foreground">Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/pest-check'}
              >
                <span className="mr-2">🐛</span>
                Check Pest/Disease
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/yield'}
              >
                <span className="mr-2">📊</span>
                View Yield Prediction
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  setCurrentDay(prev => Math.min(prev + 1, 120));
                }}
              >
                <span className="mr-2">⏭️</span>
                Advance to Day {Math.min(currentDay + 1, 120)}
              </Button>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <TaskList tasks={tasks} onToggleTask={handleToggleTask} />

        {/* Notifications Banner */}
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
          <Bell className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Daily Reminder</p>
            <p className="text-sm text-muted-foreground mt-1">
              Don't forget to check your crops today and monitor for any pests or diseases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
