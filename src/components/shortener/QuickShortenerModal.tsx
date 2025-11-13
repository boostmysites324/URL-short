import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDomains } from '@/hooks/useDomains';
import { useChannels } from '@/hooks/useChannels';
import { useCampaigns } from '@/hooks/useCampaigns';
import { usePixels } from '@/hooks/usePixels';
import { useLinks } from '@/hooks/useLinks';
import { useToast } from '@/hooks/use-toast';
import { 
  Link, 
  Settings, 
  Globe, 
  Shield, 
  Calendar, 
  Hash, 
  Tag, 
  Megaphone, 
  Square,
  Copy,
  Check,
  Loader2
} from 'lucide-react';

interface QuickShortenerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuickShortenerModal = ({ isOpen, onClose }: QuickShortenerModalProps) => {
  const [urls, setUrls] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedPixels, setSelectedPixels] = useState<string[]>([]);
  const [redirectType, setRedirectType] = useState('direct');
  const [expirationDate, setExpirationDate] = useState('');
  const [enablePassword, setEnablePassword] = useState(false);
  const [enableExpiration, setEnableExpiration] = useState(false);
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [loading, setLoading] = useState(false);
  const [createdLinks, setCreatedLinks] = useState<any[]>([]);

  const { domains } = useDomains();
  const { channels } = useChannels();
  const { campaigns } = useCampaigns();
  const { pixels } = usePixels();
  const { shortenUrl } = useLinks();
  const { toast } = useToast();

  // Set default domain when domains load
  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      const defaultDomain = domains.find(d => d.is_default) || domains[0];
      setSelectedDomain(defaultDomain.id);
    }
  }, [domains, selectedDomain]);

  const handleShorten = async () => {
    if (!urls.trim()) {
      toast({
        title: "Error",
        description: "Please enter at least one URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setCreatedLinks([]);

    // Validate custom alias if provided
    if (customAlias) {
      if (customAlias.length > 15) {
        toast({
          title: "Alias too long",
          description: "Custom alias must be 15 characters or less. Please choose a shorter alias.",
          variant: "destructive"
        });
        return;
      }
      
      const aliasRegex = /^[A-Za-z0-9-_]{3,15}$/;
      if (!aliasRegex.test(customAlias)) {
        toast({
          title: "Invalid alias format",
          description: "Alias must be 3-15 characters and contain only letters, numbers, hyphens, or underscores",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const urlList = mode === 'multiple' 
        ? urls.split('\n').filter(url => url.trim())
        : [urls.trim()];

      const results = [];
      
      // Validate UUID format for channelId and campaignId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (selectedChannel && selectedChannel.trim() !== '') {
        if (!uuidRegex.test(selectedChannel.trim())) {
          toast({
            title: "Invalid Channel ID",
            description: "Channel ID must be a valid UUID format",
            variant: "destructive"
          });
          return;
        }
      }
      
      if (selectedCampaign && selectedCampaign.trim() !== '') {
        if (!uuidRegex.test(selectedCampaign.trim())) {
          toast({
            title: "Invalid Campaign ID",
            description: "Campaign ID must be a valid UUID format",
            variant: "destructive"
          });
          return;
        }
      }

      for (const url of urlList) {
        if (!url.trim()) continue;

        const linkSettings = {
          customDomain: selectedDomain ? domains.find(d => d.id === selectedDomain)?.domain : undefined,
          analyticsEnabled: true,
          expiresAt: enableExpiration && expirationDate ? new Date(expirationDate).toISOString() : undefined,
          password: enablePassword && password ? password : undefined,
          customAlias: customAlias || undefined,
          description: description || undefined,
          channelId: selectedChannel || undefined,
          campaignId: selectedCampaign || undefined,
          pixelIds: selectedPixels,
          redirectType
        };

        const result = await shortenUrl(url, linkSettings);
        if (result) {
          results.push(result);
        }
      }

      setCreatedLinks(results);
      
      toast({
        title: "Success!",
        description: `${results.length} link(s) created successfully`,
      });

      // Reset form
      setUrls('');
      setCustomAlias('');
      setPassword('');
      setDescription('');
      setSelectedChannel('');
      setSelectedCampaign('');
      setSelectedPixels([]);
      setEnablePassword(false);
      setEnableExpiration(false);
      setExpirationDate('');

    } catch (error) {
      console.error('Error creating links:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  const togglePixel = (pixelId: string) => {
    setSelectedPixels(prev => 
      prev.includes(pixelId) 
        ? prev.filter(id => id !== pixelId)
        : [...prev, pixelId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Link className="w-5 h-5" />
            <span>Quick Shortener</span>
          </DialogTitle>
          <DialogDescription>
            Create a shortened link with advanced options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="urls">
              {mode === 'single' ? 'Paste a long link' : 'Paste up to 10 long URLs (one per line)'}
            </Label>
            {mode === 'single' ? (
              <Input
                id="urls"
                placeholder="https://example.com/very-long-url"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
              />
            ) : (
              <Textarea
                id="urls"
                placeholder="https://example.com/url1&#10;https://example.com/url2&#10;https://example.com/url3"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={4}
              />
            )}
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center space-x-1 bg-muted rounded-lg p-1 w-fit">
            <Button
              variant={mode === 'single' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('single')}
              className="px-4"
            >
              Single
            </Button>
            <Button
              variant={mode === 'multiple' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('multiple')}
              className="px-4"
            >
              Multiple
            </Button>
          </div>

          {/* Domain Selection */}
          <div className="space-y-2">
            <Label>Domain</Label>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger>
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4" />
                      <span>{domain.domain}</span>
                      {domain.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Redirect Type */}
          <div className="space-y-2">
            <Label>Redirect Type</Label>
            <Select value={redirectType} onValueChange={setRedirectType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct</SelectItem>
                {/* <SelectItem value="masked">Masked</SelectItem>
                <SelectItem value="splash">Splash Page</SelectItem> */}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Alias */}
          <div className="space-y-2">
            <Label htmlFor="customAlias">Custom Alias</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="customAlias"
                placeholder="Type your custom alias here"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If you need a custom alias, you can enter it above
            </p>
          </div>

          {/* Channel Assignment */}
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger>
                <SelectValue placeholder="Assign link to a channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: channel.color }}
                      />
                      <span>{channel.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Assignment */}
          <div className="space-y-2">
            <Label>Campaign</Label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Assign link to a campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    <div className="flex items-center space-x-2">
                      <Megaphone className="w-4 h-4" />
                      <span>{campaign.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pixels */}
          {pixels.length > 0 && (
            <div className="space-y-2">
              <Label>Pixels</Label>
              <div className="space-y-2">
                {pixels.map((pixel) => (
                  <div key={pixel.id} className="flex items-center space-x-2">
                    <Button
                      variant={selectedPixels.includes(pixel.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePixel(pixel.id)}
                      className="flex items-center space-x-2"
                    >
                      <Square className="w-4 h-4" />
                      <span>{pixel.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {pixel.provider}
                      </Badge>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Password Protection */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="password"
                checked={enablePassword}
                onCheckedChange={setEnablePassword}
              />
              <Label htmlFor="password">Password Protection</Label>
            </div>
            {enablePassword && (
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Type your password here"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              By adding a password, you can restrict the access
            </p>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="expiration"
                checked={enableExpiration}
                onCheckedChange={setEnableExpiration}
              />
              <Label htmlFor="expiration">Set Expiration</Label>
            </div>
            {enableExpiration && (
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="datetime-local"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 text-muted-foreground w-4 h-4" />
              <Textarea
                id="description"
                placeholder="Type your description here"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="pl-10"
                rows={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This can be used to identify URLs on your account
            </p>
          </div>

          {/* Created Links */}
          {createdLinks.length > 0 && (
            <div className="space-y-2">
              <Label>Created Links</Label>
              <div className="space-y-2">
                {createdLinks.map((link, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{link.originalUrl}</p>
                      <p className="text-sm text-muted-foreground">{link.shortUrl}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(link.shortUrl)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleShorten} disabled={loading || !urls.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Shorten
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickShortenerModal;
