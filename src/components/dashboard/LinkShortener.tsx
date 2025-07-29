import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Link as LinkIcon, Settings, ExternalLink, Sparkles, Clock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const LinkShortener = () => {
  const [inputUrl, setInputUrl] = useState("");
  const [mode, setMode] = useState<"single" | "multiple">("single");
  const [shortenedLinks, setShortenedLinks] = useState([
    {
      id: 1,
      original: "https://b2u.io/Betbhai",
      shortened: "https://wa.me/919897879056?text=Hi%2C%20I%20need%2...",
      clicks: 55,
      uniqueClicks: 55,
      created: "2 months ago"
    },
    {
      id: 2,
      original: "https://b2u.io/Tiger",
      shortened: "https://wa.me/919897879056?text=Hi%2C%20I%20need%2...",
      clicks: 1136,
      uniqueClicks: 1017,
      created: "2 months ago"
    }
  ]);
  
  const { toast } = useToast();

  const handleShorten = () => {
    if (!inputUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a URL to shorten",
        variant: "destructive"
      });
      return;
    }

    // Simple URL shortening simulation
    const newLink = {
      id: Date.now(),
      original: inputUrl,
      shortened: `https://short.ly/${Math.random().toString(36).substr(2, 8)}`,
      clicks: 0,
      uniqueClicks: 0,
      created: "Just now"
    };

    setShortenedLinks([newLink, ...shortenedLinks]);
    setInputUrl("");
    
    toast({
      title: "Success",
      description: "Link shortened successfully!",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Link copied to clipboard",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Shorten Link Card */}
      <Card className="p-8 card-gradient shadow-card border-card-border hover-glow group">
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
              <LinkIcon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-card-foreground">Shorten Link</h3>
              <p className="text-sm text-muted-foreground">Transform your long URLs into shareable short links</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="Paste your long URL here..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="h-12 pl-4 pr-12 text-base border-2 focus:border-primary transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && handleShorten()}
              />
              {inputUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setInputUrl("")}
                >
                  ×
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleShorten}
                className="h-12 px-8 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-lg hover:shadow-glow transition-all duration-300 group"
                disabled={!inputUrl.trim()}
              >
                <Sparkles className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Shorten
              </Button>
              <Button variant="outline" className="h-12 w-12 p-0 hover-lift">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Enhanced Mode Toggle */}
          <div className="flex items-center space-x-1 bg-surface-secondary/50 rounded-xl p-1.5 w-fit">
            <Button
              variant={mode === "single" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("single")}
              className={`px-6 rounded-lg transition-all duration-300 ${
                mode === "single" 
                  ? "bg-gradient-to-r from-primary to-primary-dark shadow-md" 
                  : "hover:bg-surface-secondary"
              }`}
            >
              Single
            </Button>
            <Button
              variant={mode === "multiple" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("multiple")}
              className={`px-6 rounded-lg transition-all duration-300 ${
                mode === "multiple" 
                  ? "bg-gradient-to-r from-primary to-primary-dark shadow-md" 
                  : "hover:bg-surface-secondary"
              }`}
            >
              Multiple
            </Button>
          </div>
        </div>
      </Card>

      {/* Enhanced Recent Links */}
      <Card className="card-gradient shadow-card border-card-border hover-glow animate-slide-up">
        <div className="p-6 border-b border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-card-foreground">Recent Links</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage and track your shortened URLs</p>
            </div>
            <Button variant="ghost" size="sm" className="hover-lift">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="divide-y divide-card-border">
          {shortenedLinks.map((link, index) => (
            <div key={link.id} className="p-6 hover:bg-surface-secondary/50 transition-all duration-300 group interactive-card" style={{animationDelay: `${index * 0.1}s`}}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success rounded-full animate-pulse-custom"></div>
                      <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{link.created}</span>
                    </div>
                  </div>
                  
                  <a 
                    href={link.shortened} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark font-semibold text-lg truncate flex items-center space-x-2 group-hover:underline transition-all duration-300"
                  >
                    <span className="truncate">{link.shortened}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  </a>
                  
                  <p className="text-sm text-muted-foreground truncate mt-1 group-hover:text-card-foreground transition-colors">
                    {link.original}
                  </p>
                  
                  <div className="flex items-center space-x-6 mt-3">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm font-medium text-card-foreground">{link.clicks}</span>
                      <span className="text-xs text-muted-foreground">Total Clicks</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-sm font-medium text-card-foreground">{link.uniqueClicks}</span>
                      <span className="text-xs text-muted-foreground">Unique</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(link.shortened)}
                  className="flex items-center space-x-2 hover-lift hover:border-primary group-hover:shadow-md transition-all duration-300"
                >
                  <Copy className="w-4 h-4" />
                  <span className="font-medium">Copy</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default LinkShortener;