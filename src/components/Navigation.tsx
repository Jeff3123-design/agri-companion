import { Home, Bug, CloudSun, TrendingUp, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

export const Navigation = () => {
  const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Bug, label: "Pest Check", path: "/pest-check" },
    { icon: CloudSun, label: "Weather", path: "/weather" },
    { icon: TrendingUp, label: "Yield", path: "/yield" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:top-0 md:bottom-auto md:border-b md:border-t-0">
      <div className="container mx-auto px-4">
        <div className="flex justify-around md:justify-center md:gap-8 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg transition-all",
                "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              activeClassName="text-primary bg-primary/10 font-medium"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs md:text-sm">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};
