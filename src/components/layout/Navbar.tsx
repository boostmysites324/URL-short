import { Link, Command, User, Moon, Sun, Archive, BarChart3, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        navigate('/');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

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

          {/* Center - Quick Shortener & Archives (Desktop) */}
          <div className="hidden md:flex items-center space-x-2 animate-scale-in">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-muted-foreground hover:text-card-foreground hover:bg-surface-secondary/80 transition-all duration-300 rounded-lg px-4 py-2 group"
            >
              <Command className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Quick Shortener</span>
              <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-md border border-border bg-muted px-2 font-mono text-[11px] font-medium text-muted-foreground shadow-sm">
                CTRL + K
              </kbd>
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/statistics')}
              className="flex items-center space-x-2 text-muted-foreground hover:text-card-foreground hover:bg-surface-secondary/80 transition-all duration-300 rounded-lg px-4 py-2 group"
            >
              <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Statistics</span>
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/archives')}
              className="flex items-center space-x-2 text-muted-foreground hover:text-card-foreground hover:bg-surface-secondary/80 transition-all duration-300 rounded-lg px-4 py-2 group"
            >
              <Archive className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Archives</span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="w-10 h-10 p-0 hover:bg-surface-secondary/80 transition-all duration-300 rounded-lg"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Right - Theme Toggle & User (Desktop) */}
          <div className="hidden md:flex items-center space-x-4 animate-fade-in">
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
            
            {user ? (
              <div className="flex items-center space-x-3 hover:bg-surface-secondary/50 rounded-lg p-2 transition-all duration-300 cursor-pointer group">
                <div className="text-right">
                  <p className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">User</p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full shadow-md group-hover:shadow-glow group-hover:scale-105 transition-all duration-300">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => window.location.href = '/auth'}
              >
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Theme Toggle & User */}
          <div className="md:hidden flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-8 h-8 p-0 hover:bg-surface-secondary/80 transition-all duration-300 rounded-lg"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </Button>
            
            {user && (
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-full shadow-md">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-card-border shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                onClick={() => handleNavigation('/')}
                className="w-full flex items-center justify-start space-x-3 text-left text-muted-foreground hover:text-card-foreground hover:bg-surface-secondary/80 transition-all duration-300 rounded-lg px-4 py-3"
              >
                <Command className="w-5 h-5" />
                <span className="font-medium">Quick Shortener</span>
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => handleNavigation('/statistics')}
                className="w-full flex items-center justify-start space-x-3 text-left text-muted-foreground hover:text-card-foreground hover:bg-surface-secondary/80 transition-all duration-300 rounded-lg px-4 py-3"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Statistics</span>
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => handleNavigation('/archives')}
                className="w-full flex items-center justify-start space-x-3 text-left text-muted-foreground hover:text-card-foreground hover:bg-surface-secondary/80 transition-all duration-300 rounded-lg px-4 py-3"
              >
                <Archive className="w-5 h-5" />
                <span className="font-medium">Archives</span>
              </Button>
              
              {/* Mobile User Actions */}
              {user && (
                <>
                  <div className="border-t border-card-border my-3"></div>
                  <div className="px-4 py-2">
                    <p className="text-sm font-semibold text-card-foreground mb-1">
                      {user.user_metadata?.full_name || user.email}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">Logged in user</p>
                    <Button
                      variant="outline"
                      onClick={signOut}
                      className="w-full text-muted-foreground hover:text-destructive"
                    >
                      Sign Out
                    </Button>
                  </div>
                </>
              )}
              
              {!user && (
                <>
                  <div className="border-t border-card-border my-3"></div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = '/auth';
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
    </nav>
  );
};

export default Navbar;