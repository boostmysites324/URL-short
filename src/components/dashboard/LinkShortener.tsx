import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Link as LinkIcon, Settings, ExternalLink } from "lucide-react";
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
    <div className="space-y-6">
      {/* Shorten Link Card */}
      <Card className="p-6 card-gradient shadow-card border-card-border">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-card-foreground flex items-center space-x-2">
            <LinkIcon className="w-5 h-5" />
            <span>Shorten Link</span>
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Paste a long link"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleShorten()}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleShorten}
                className="px-6"
              >
                Shorten
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center space-x-1 bg-secondary rounded-lg p-1">
            <Button
              variant={mode === "single" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("single")}
              className="flex-1"
            >
              Single
            </Button>
            <Button
              variant={mode === "multiple" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("multiple")}
              className="flex-1"
            >
              Multiple
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Links */}
      <Card className="card-gradient shadow-card border-card-border">
        <div className="p-6 border-b border-card-border">
          <h3 className="text-lg font-medium text-card-foreground flex items-center justify-between">
            Recent Links
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </h3>
        </div>
        
        <div className="divide-y divide-card-border">
          {shortenedLinks.map((link) => (
            <div key={link.id} className="p-6 hover:bg-surface-secondary/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <a 
                      href={link.shortened} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark font-medium truncate flex items-center space-x-1"
                    >
                      <span className="truncate">{link.shortened}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{link.original}</p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                    <span>{link.clicks} Clicks</span>
                    <span>{link.uniqueClicks} Unique Clicks</span>
                    <span>{link.created}</span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(link.shortened)}
                  className="flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
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