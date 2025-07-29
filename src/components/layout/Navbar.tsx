import { Link, Command, User, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const Navbar = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or default to light
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = saved === 'dark' || (!saved && prefersDark);
    
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  return (
    <nav className="w-full border-b border-card-border bg-card shadow-card backdrop-blur-sm bg-opacity-95 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 animate-fade-in">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl shadow-lg hover:shadow-glow transition-all duration-300 hover:scale-105">
              <Link className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-card-foreground bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              ShortLink
            </span>
          </div>

          {/* Center - Quick Shortener */}
          <div className="hidden md:flex items-center animate-scale-in">
            <Button 
              variant="ghost" 
              className="flex items-center space-x-2 text-muted-foreground hover:text-card-foreground hover:bg-surface-secondary/80 transition-all duration-300 rounded-lg px-4 py-2 group"
            >
              <Command className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Quick Shortener</span>
              <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-md border border-border bg-muted px-2 font-mono text-[11px] font-medium text-muted-foreground shadow-sm">
                CTRL + K
              </kbd>
            </Button>
          </div>

          {/* Right - Theme Toggle & User */}
          <div className="flex items-center space-x-4 animate-fade-in">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-10 h-10 p-0 hover:bg-surface-secondary/80 hover:scale-110 transition-all duration-300 rounded-lg"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            <div className="flex items-center space-x-3 hover:bg-surface-secondary/50 rounded-lg p-2 transition-all duration-300 cursor-pointer group">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors">
                  Gopalkrishna94173
                </p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full shadow-md group-hover:shadow-glow group-hover:scale-105 transition-all duration-300">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;