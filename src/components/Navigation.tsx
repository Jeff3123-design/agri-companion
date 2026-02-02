import { useEffect, useState } from "react";
import { Home, Bug, CloudSun, TrendingUp, Menu, X, Calendar as CalendarIcon, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileAvatar } from "@/components/ProfileAvatar";

export const Navigation = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string | null } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session) {
        setUserId(session.user.id);
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .single();
        if (profileData) setProfile(profileData);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        setUserId(session.user.id);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .single();
        if (profileData) setProfile(profileData);
      } else {
        setUserId(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAuthenticated) return null;

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: BarChart3, label: "Progress", path: "/progress" },
    { icon: CalendarIcon, label: "Calendar", path: "/calendar" },
    { icon: Bug, label: "Pest Check", path: "/pest-check" },
    { icon: CloudSun, label: "Weather", path: "/weather" },
    { icon: TrendingUp, label: "Yield", path: "/yield" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-card border-b border-border z-50">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex justify-between items-center py-3">

          {/* Mobile Hamburger */}
          <button 
            onClick={() => setIsOpen(true)} 
            className="md:hidden p-2 rounded-lg hover:bg-muted transition"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6">
            {navItems.map((item, i) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                activeClassName="text-primary bg-primary/10 font-medium"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Desktop Theme Toggle + Profile */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {userId && (
              <ProfileAvatar
                userId={userId}
                fullName={profile?.full_name}
                avatarUrl={profile?.avatar_url}
                onAvatarUpdate={(url) => setProfile((p) => p ? { ...p, avatar_url: url } : null)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------- */}
      {/* BACKDROP (blur + dim background) */}
      {/* ---------------------------------------------- */}
      <div
        onClick={() => setIsOpen(false)}
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* ---------------------------------------------- */}
      {/* MOBILE SLIDE-IN MENU (LEFT → RIGHT) */}
      {/* ---------------------------------------------- */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card shadow-xl border-r border-border z-50 md:hidden",
          "transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close Button */}
        <div className="flex items-center justify-between py-4 px-4 border-b border-border">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-muted"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items (animated) */}
        <div className="flex flex-col gap-2 p-4">
          {navItems.map((item, i) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg",
                "text-muted-foreground hover:text-foreground hover:bg-muted",
                // Animation: slight slide + fade
                "translate-x-[-10px] opacity-0 animate-slideFadeIn",
              )}
              style={{ animationDelay: `${i * 0.07}s` }} // stagger effect
              activeClassName="text-primary bg-primary/10 font-medium"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}

          {/* Theme Toggle + Profile */}
          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            {userId && (
              <div className="flex items-center gap-3">
                <ProfileAvatar
                  userId={userId}
                  fullName={profile?.full_name}
                  avatarUrl={profile?.avatar_url}
                  onAvatarUpdate={(url) => setProfile((p) => p ? { ...p, avatar_url: url } : null)}
                />
                <span className="text-sm text-foreground">{profile?.full_name || "Your Profile"}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
