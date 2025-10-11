import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Copy, Link as LinkIcon, Settings, ExternalLink, Sparkles, Clock, Check, Search, MoreHorizontal, Calendar, Lock, Globe, Share, BarChart3, Edit, Archive, Eye, QrCode, Download, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useLinks } from "@/hooks/useLinks";
import { useDomains } from "@/hooks/useDomains";
import { useChannels } from "@/hooks/useChannels";
import { useCampaigns } from "@/hooks/useCampaigns";
import BulkActions from "@/components/links/BulkActions";
import ShortLinkModal from "@/components/shortener/ShortLinkModal";
import RecentActivitySidebar from "@/components/dashboard/RecentActivitySidebar";
import EditUrlModal from "@/components/links/EditUrlModal";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const LinkShortener = () => {
  const navigate = useNavigate();
  const [inputUrl, setInputUrl] = useState("");
  const [mode, setMode] = useState<"single" | "multiple">("single");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [settings, setSettings] = useState({
    customDomain: false,
    analytics: true,
    expiration: false,
    password: false,
    customDomainUrl: "",
    expirationDate: undefined as Date | undefined,
    passwordValue: "",
    customAlias: "",
    description: "",
    redirectType: "direct",
    channelId: "",
    campaignId: "",
    domainValidation: {
      isValid: false,
      isChecking: false,
      message: ""
    }
  });
  const [showShortLinkModal, setShowShortLinkModal] = useState(false);
  const [newShortLink, setNewShortLink] = useState<{
    shortUrl: string;
    originalUrl: string;
    linkId: string;
    createdAt: string;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState<{
    shortUrl: string;
    originalUrl: string;
    linkId: string;
    createdAt: string;
  } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLink, setEditLink] = useState<any>(null);
  
  const { toast } = useToast();
  const { links, loading, shortenUrl, refreshLinks, page, hasMore, nextPage, prevPage } = useLinks();
  const { domains } = useDomains();
  const { channels } = useChannels();
  const { campaigns } = useCampaigns();

  // URL validation function
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Domain validation function
  const validateDomain = async (domain: string) => {
    if (!domain) return;
    
    setSettings(prev => ({
      ...prev,
      domainValidation: { isValid: false, isChecking: true, message: "Validating domain..." }
    }));

    try {
      // Basic domain format validation
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
      if (!domainRegex.test(domain)) {
        setSettings(prev => ({
          ...prev,
          domainValidation: { isValid: false, isChecking: false, message: "Invalid domain format" }
        }));
        return;
      }

      // Check if domain is reachable
      const response = await fetch(`https://${domain}`, { 
        method: 'HEAD', 
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });
      
      setSettings(prev => ({
        ...prev,
        domainValidation: { isValid: true, isChecking: false, message: "Domain is valid and reachable" }
      }));
    } catch (error) {
      setSettings(prev => ({
        ...prev,
        domainValidation: { isValid: false, isChecking: false, message: "Domain is not reachable or invalid" }
      }));
    }
  };

  // Convert IST date to UTC for database storage
  const convertISTToUTC = (istDate: Date) => {
    // IST is UTC+5:30, so we need to subtract 5.5 hours to get UTC
    const utcDate = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
    return utcDate.toISOString();
  };

  const handleShorten = async () => {
    if (mode === "single") {
      await handleSingleShorten();
    } else {
      await handleMultipleShorten();
    }
  };

  const handleSingleShorten = async () => {
    console.log('handleSingleShorten called with:', inputUrl);
    
    if (!inputUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a URL to shorten",
        variant: "destructive"
      });
      return;
    }

    if (!isValidUrl(inputUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://example.com)",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('About to call shortenUrl with:', inputUrl);
      
      // Validate settings before proceeding
      if (settings.customDomain && (!settings.customDomainUrl || !settings.domainValidation.isValid)) {
        toast({
          title: "Invalid Domain",
          description: "Please enter a valid custom domain",
          variant: "destructive"
        });
        return;
      }

      if (settings.password && !settings.passwordValue.trim()) {
        toast({
          title: "Password Required",
          description: "Please enter a password for the protected link",
          variant: "destructive"
        });
        return;
      }

      if (settings.expiration && !settings.expirationDate) {
        toast({
          title: "Expiration Date Required",
          description: "Please set an expiration date",
          variant: "destructive"
        });
        return;
      }

      const linkSettings = {
        customDomain: settings.customDomain && settings.domainValidation.isValid ? settings.customDomainUrl : undefined,
        analyticsEnabled: settings.analytics,
        expiresAt: settings.expiration && settings.expirationDate ? convertISTToUTC(settings.expirationDate) : undefined,
        password: settings.password && settings.passwordValue ? settings.passwordValue : undefined,
        customAlias: settings.customAlias || undefined,
        description: settings.description || undefined,
        channelId: settings.channelId || undefined,
        campaignId: settings.campaignId || undefined,
        redirectType: settings.redirectType || 'direct'
      };

      console.log('Link settings:', linkSettings);
      const result = await shortenUrl(inputUrl, linkSettings);
      console.log('shortenUrl result:', result);
      
      if (result) {
        setInputUrl("");
        // Show the short link modal
        setNewShortLink({
          shortUrl: result.shortUrl,
          originalUrl: inputUrl,
          linkId: result.id,
          createdAt: result.created_at || new Date().toISOString()
        });
        setShowShortLinkModal(true);
        // Refresh links to show the new link in recent links
        refreshLinks();
        // Auto copy to clipboard
        await copyToClipboard(result.shortUrl, result.id);
      }
    } catch (error) {
      console.error('Failed to shorten URL in component:', error);
      // Error handling is done in the hook
    }
  };

  const handleMultipleShorten = async () => {
    if (!inputUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter URLs to shorten (one per line)",
        variant: "destructive",
      });
      return;
    }

    // Split URLs by newlines and filter out empty lines
    const urls = inputUrl.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    
    if (urls.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one URL",
        variant: "destructive",
      });
      return;
    }

    if (urls.length > 10) {
      toast({
        title: "Error",
        description: "Maximum 10 URLs allowed",
        variant: "destructive",
      });
      return;
    }

    // Validate all URLs
    const invalidUrls = urls.filter(url => !isValidUrl(url));
    if (invalidUrls.length > 0) {
      toast({
        title: "Error",
        description: `Invalid URLs: ${invalidUrls.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const linkSettings = {
        customDomain: settings.customDomain ? "short.ly" : undefined,
        analyticsEnabled: settings.analytics,
        expiresAt: settings.expiration ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        password: settings.password ? "password123" : undefined
      };

      toast({
        title: "Processing...",
        description: `Shortening ${urls.length} URLs`,
      });

      // Process URLs with 100ms delay between each
      for (let i = 0; i < urls.length; i++) {
        try {
          const result = await shortenUrl(urls[i], linkSettings);
          console.log(`Shortened URL ${i + 1}/${urls.length}:`, result);
          
          // Add 100ms delay between requests
          if (i < urls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Failed to shorten URL ${i + 1}:`, error);
        }
      }

      // Clear input and refresh links
      setInputUrl("");
      refreshLinks();
      
      toast({
        title: "Success!",
        description: `Successfully shortened ${urls.length} URLs`,
      });
    } catch (error) {
      console.error('Failed to shorten multiple URLs:', error);
      toast({
        title: "Error",
        description: "Failed to shorten some URLs",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string, linkId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (linkId) {
        setCopiedId(linkId);
        setTimeout(() => setCopiedId(null), 2000);
      }
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: show the text in a prompt or use a different method
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleShareClick = (link: any) => {
    setShareLink({
      shortUrl: link.short_url,
      originalUrl: link.original_url,
      linkId: link.id,
      createdAt: link.created_at
    });
    setShowShareModal(true);
  };

  const handleStatisticsClick = (link: any) => {
    navigate(`/statistics/${link.id}`);
  };

  const handleEditClick = (link: any) => {
    setEditLink(link);
    setShowEditModal(true);
  };

  const handleArchiveClick = async (link: any) => {
    try {
      const { error } = await supabase
        .from('links')
        .update({ is_archived: true })
        .eq('id', link.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Link archived successfully",
      });

      refreshLinks();
    } catch (error) {
      console.error('Error archiving link:', error);
      toast({
        title: "Error",
        description: "Failed to archive link",
        variant: "destructive",
      });
    }
  };

  const handleExportStatistics = async (link: any) => {
    try {
      // Fetch detailed click data for this link
      const { data: clicksData, error: clicksError } = await supabase
        .from('clicks')
        .select('*')
        .eq('link_id', link.id)
        .order('created_at', { ascending: false });

      if (clicksError) throw clicksError;

      if (!clicksData || clicksData.length === 0) {
        toast({
          title: "No Data",
          description: "No click data available for this link",
          variant: "destructive",
        });
        return;
      }

      // Prepare CSV data
      const csvHeaders = [
        'Date',
        'Time',
        'Country',
        'City',
        'Region',
        'IP Address',
        'Device Type',
        'Browser',
        'Operating System',
        'User Agent',
        'Referrer',
        'Is Unique Click'
      ];

      const csvRows = clicksData.map(click => [
        new Date(click.created_at).toLocaleDateString(),
        new Date(click.created_at).toLocaleTimeString(),
        click.country_name || click.country || 'Unknown',
        click.city || 'Unknown',
        click.region || 'Unknown',
        click.ip_address || 'Unknown',
        click.device_type || 'Unknown',
        click.browser || 'Unknown',
        click.os || 'Unknown',
        click.user_agent || 'Unknown',
        click.referer || 'Direct',
        click.is_unique ? 'Yes' : 'No'
      ]);

      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadLink = document.createElement('a');
      const url = URL.createObjectURL(blob);
      downloadLink.setAttribute('href', url);
      downloadLink.setAttribute('download', `statistics_${link.short_code}_${new Date().toISOString().split('T')[0]}.csv`);
      downloadLink.style.visibility = 'hidden';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast({
        title: "Success",
        description: "Statistics exported successfully",
      });
    } catch (error) {
      console.error('Error exporting statistics:', error);
      toast({
        title: "Error",
        description: "Failed to export statistics",
        variant: "destructive",
      });
    }
  };

  const handleResetStats = async (link: any) => {
    if (!confirm('Are you sure you want to reset all statistics for this link? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete all clicks for this link
      const { error: clicksError } = await supabase
        .from('clicks')
        .delete()
        .eq('link_id', link.id);

      if (clicksError) throw clicksError;

      // Delete all analytics_daily for this link
      const { error: analyticsError } = await supabase
        .from('analytics_daily')
        .delete()
        .eq('link_id', link.id);

      if (analyticsError) throw analyticsError;

      toast({
        title: "Success",
        description: "Statistics reset successfully",
      });

      refreshLinks();
    } catch (error) {
      console.error('Error resetting statistics:', error);
      toast({
        title: "Error",
        description: "Failed to reset statistics",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLink = async (link: any) => {
    if (!confirm('Are you sure you want to permanently delete this link? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete all related data first
      await supabase.from('clicks').delete().eq('link_id', link.id);
      await supabase.from('analytics_daily').delete().eq('link_id', link.id);
      
      // Delete the link itself
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', link.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Link deleted permanently",
      });

      refreshLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({
        title: "Error",
        description: "Failed to delete link",
        variant: "destructive",
      });
    }
  };

  const toggleLinkSelection = (linkId: string) => {
    setSelectedLinks(prev => 
      prev.includes(linkId) 
        ? prev.filter(id => id !== linkId)
        : [...prev, linkId]
    );
  };

  const selectAllLinks = () => {
    const filteredLinks = links.filter(link => 
      link.original_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.short_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.title && link.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setSelectedLinks(filteredLinks.map(link => link.id));
  };

  const clearSelection = () => {
    setSelectedLinks([]);
  };

  const filteredLinks = links.filter(link => 
    link.original_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.short_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (link.title && link.title.toLowerCase().includes(searchTerm.toLowerCase()))
  ); // useLinks already limits to 30 per page

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 xl:gap-6 animate-fade-in">
      {/* Main Content - wider */}
      <div className="lg:col-span-8 xl:col-span-8 space-y-6">
        {/* Enhanced Shorten Link Card */}
        <Card className="p-6 lg:p-7 xl:p-8 card-gradient shadow-card border-card-border hover-glow group">
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
              {mode === "single" ? (
                <Input
                  placeholder="Paste your long URL here..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
              ) : (
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Paste your URLs here (one per line)..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
              )}
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
            <div className="flex gap-3 items-center">
              {/* Customization dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-12 px-3 gap-2 rounded-lg hover:border-primary">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Customize</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[520px] p-4 rounded-xl bg-card border border-card-border shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">Customize</p>
                      <p className="text-xs text-muted-foreground">Fine-tune options before shortening</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Domain */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Domain</Label>
                      <Input
                        placeholder="https://b2u.io"
                        value={settings.customDomainUrl}
                        onChange={(e) => setSettings({ ...settings, customDomainUrl: e.target.value, customDomain: !!e.target.value })}
                      />
                      <p className="text-[10px] text-muted-foreground">Leave blank to use the default domain</p>
                    </div>
                    {/* Redirect */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Redirect</Label>
                      <Select value={settings.redirectType} onValueChange={(v) => setSettings({ ...settings, redirectType: v })}>
                        <SelectTrigger className="w-full h-9 rounded-md"><SelectValue placeholder="Direct" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="301">301</SelectItem>
                          <SelectItem value="302">302</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Custom alias */}
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Custom</Label>
                      <div className="relative">
                        <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-8 rounded-md" placeholder="Type your custom alias here" value={settings.customAlias} onChange={(e) => setSettings({ ...settings, customAlias: e.target.value })} />
                      </div>
                    </div>
                    {/* Channel */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Channel</Label>
                      <Input className="rounded-md" placeholder="Assign link to a channel" value={settings.channelId} onChange={(e) => setSettings({ ...settings, channelId: e.target.value })} />
                    </div>
                    {/* Password */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Password</Label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-8 rounded-md" type="password" placeholder="Type your password here" value={settings.passwordValue} onChange={(e) => setSettings({ ...settings, password: !!e.target.value, passwordValue: e.target.value })} />
                      </div>
                    </div>
                    {/* Description */}
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Input className="rounded-md" placeholder="Type your description here" value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSettings({
                        ...settings,
                        customDomainUrl: "",
                        customDomain: false,
                        redirectType: "direct",
                        customAlias: "",
                        channelId: "",
                        passwordValue: "",
                        password: false,
                        description: "",
                      });
                    }}>Reset</Button>
                    <Button size="sm" onClick={() => { /* just close - values already bound */ }}>Apply</Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                onClick={handleShorten}
                className="h-12 px-8 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-lg hover:shadow-glow transition-all duration-300 group"
                disabled={!inputUrl.trim() || loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Shorten
                  </>
                )}
              </Button>

              {/* Mode toggle (compact) */}
              <div className="hidden sm:flex items-center space-x-2 ml-2">
                <Button
                  variant={mode === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('single')}
                >
                  Single
                </Button>
                <Button
                  variant={mode === 'multiple' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('multiple')}
                >
                  Multiple
                </Button>
              </div>
            </div>
          </div>

          {/* Inline options removed in favor of dropdown customization */}
        </div>
      </Card>

      {/* Enhanced Recent Links */}
      <Card className="card-gradient shadow-card border-card-border hover-glow animate-slide-up">
        <div className="p-5 lg:p-6 border-b border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-card-foreground">Recent Links</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage and track your shortened URLs</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search links..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="ghost" size="sm" className="hover-lift">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <BulkActions 
          selectedLinks={selectedLinks}
          onClearSelection={clearSelection}
          onRefresh={refreshLinks}
        />
        
        <div className="divide-y divide-card-border">
          {filteredLinks.length === 0 ? (
            <div className="p-8 text-center">
              <LinkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No links match your search.' : 'No links yet. Create your first shortened link above!'}
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="p-4 border-b border-card-border">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedLinks.length === filteredLinks.length && filteredLinks.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectAllLinks();
                      } else {
                        clearSelection();
                      }
                    }}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium">
                    Select All ({filteredLinks.length} links)
                  </Label>
                </div>
              </div>
              
              {filteredLinks.map((link, index) => (
                <div key={link.id} className="p-6 hover:bg-surface-secondary/50 transition-all duration-300 group interactive-card" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedLinks.includes(link.id)}
                      onCheckedChange={() => toggleLinkSelection(link.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full animate-pulse-custom ${
                                link.status === 'active' ? 'bg-success' : 'bg-warning'
                              }`}></div>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                link.status === 'active' 
                                  ? 'text-success bg-success/10' 
                                  : 'text-warning bg-warning/10'
                              }`}>
                                {link.status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{format(new Date(link.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                          
                          <a 
                            href={link.short_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-dark font-semibold text-lg truncate flex items-center space-x-2 group-hover:underline transition-all duration-300"
                          >
                            <span className="truncate">{link.short_url}</span>
                            <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          </a>
                          
                          <p className="text-sm text-muted-foreground truncate mt-1 group-hover:text-card-foreground transition-colors">
                            {link.original_url}
                          </p>
                          
                          {/* Channel and Campaign badges */}
                          {(link.channel_id || link.campaign_id) && (
                            <div className="flex items-center space-x-2 mt-2">
                              {link.channel_id && (
                                <Badge variant="secondary" className="text-xs">
                                  Channel
                                </Badge>
                              )}
                              {link.campaign_id && (
                                <Badge variant="outline" className="text-xs">
                                  Campaign
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-6 mt-3">
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <span className="text-sm font-medium text-card-foreground">{link.total_clicks || 0}</span>
                              <span className="text-xs text-muted-foreground">Total Clicks</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-success rounded-full"></div>
                              <span className="text-sm font-medium text-card-foreground">{link.unique_clicks || 0}</span>
                              <span className="text-xs text-muted-foreground">Unique</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(link.short_url, link.id)}
                            className="flex items-center space-x-2 hover-lift hover:border-primary group-hover:shadow-md transition-all duration-300"
                          >
                            {copiedId === link.id ? (
                              <>
                                <Check className="w-4 h-4 text-success" />
                                <span className="font-medium text-success">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span className="font-medium">Copy</span>
                              </>
                            )}
                          </Button>
                          
                          {/* 3-Dot Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleShareClick(link)}>
                                <Share className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatisticsClick(link)}>
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Statistics
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditClick(link)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleArchiveClick(link)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              {/* <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                Set Public
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <QrCode className="w-4 h-4 mr-2" />
                                Custom QR Code
                              </DropdownMenuItem> */}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleExportStatistics(link)}>
                                <Download className="w-4 h-4 mr-2" />
                                Export Statistics
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetStats(link)}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset Stats
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleDeleteLink(link)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {/* Pagination */}
              <div className="p-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Page {page}</div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={prevPage} disabled={page === 1}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextPage} disabled={!hasMore}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
      </div>

      {/* Recent Activity Sidebar - narrower */}
      <div className="lg:col-span-4 xl:col-span-4">
        <RecentActivitySidebar />
      </div>

      {/* Short Link Modal */}
      {newShortLink && (
        <ShortLinkModal
          isOpen={showShortLinkModal}
          onClose={() => {
            setShowShortLinkModal(false);
            setNewShortLink(null);
          }}
          shortUrl={newShortLink.shortUrl}
          originalUrl={newShortLink.originalUrl}
          linkId={newShortLink.linkId}
          createdAt={newShortLink.createdAt}
        />
      )}

      {/* Share Modal */}
      {shareLink && (
        <ShortLinkModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setShareLink(null);
          }}
          shortUrl={shareLink.shortUrl}
          originalUrl={shareLink.originalUrl}
          linkId={shareLink.linkId}
          createdAt={shareLink.createdAt}
        />
      )}

      {/* Edit URL Modal */}
      {showEditModal && editLink && (
        <EditUrlModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditLink(null);
          }}
          link={editLink}
          onUpdate={refreshLinks}
        />
      )}
    </div>
  );
};

export default LinkShortener;