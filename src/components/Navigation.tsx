import { useEffect, useState } from "react";
import { Home, Bug, CloudSun, TrendingUp, Settings, Calendar as CalendarIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Navigation = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: CalendarIcon, label: "Calendar", path: "/calendar" },
    { icon: Bug, label: "Pest Check", path: "/pest-check" },
    { icon: CloudSun, label: "Weather", path: "/weather" },
    { icon: TrendingUp, label: "Yield", path: "/yield" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:top-0 md:bottom-auto md:border-b md:border-t-0">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex justify-around md:justify-center md:gap-6 py-3 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-lg transition-all",
                  "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                activeClassName="text-primary bg-primary/10 font-medium"
              >
                <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm">{item.label}</span>
              </NavLink>
            ))}
          </div>
          <div className="hidden md:flex items-center pr-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};
