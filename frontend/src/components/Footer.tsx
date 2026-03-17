import { Sprout } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Sprout className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">FarmBuddy</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <p className="text-sm">
            © {new Date().getFullYear()} FarmBuddy Software. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
