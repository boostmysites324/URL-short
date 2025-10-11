import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Globe, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EditUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: any;
  onUpdate: () => void;
}

export default function EditUrlModal({ isOpen, onClose, link, onUpdate }: EditUrlModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    customDomain: false,
    customDomainUrl: '',
    analyticsEnabled: true,
    expirationEnabled: false,
    expirationDate: undefined as Date | undefined,
    passwordEnabled: false,
    passwordValue: ''
  });

  const [domainValidation, setDomainValidation] = useState({
    isValid: true,
    message: ''
  });

  // Initialize settings from link data
  useEffect(() => {
    if (link) {
      setSettings({
        customDomain: !!link.custom_domain,
        customDomainUrl: link.custom_domain || '',
        analyticsEnabled: link.analytics_enabled !== false,
        expirationEnabled: !!link.expires_at,
        expirationDate: link.expires_at ? new Date(link.expires_at) : undefined,
        passwordEnabled: !!link.password_hash,
        passwordValue: ''
      });
    }
  }, [link]);

  const validateDomain = async (domain: string) => {
    if (!domain) {
      setDomainValidation({ isValid: true, message: '' });
      return;
    }

    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      setDomainValidation({ isValid: false, message: 'Invalid domain format' });
      return;
    }

    // Check if domain is reachable
    try {
      const response = await fetch(`https://${domain}`, { 
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });
      setDomainValidation({ isValid: true, message: 'Domain is valid' });
    } catch (error) {
      setDomainValidation({ isValid: false, message: 'Domain is not reachable' });
    }
  };

  const convertISTToUTC = (istDate: Date): Date => {
    // IST is UTC+5:30
    const utcDate = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
    return utcDate;
  };

  const handleSave = async () => {
    if (!link) return;

    setLoading(true);
    try {
      // Validate settings
      if (settings.customDomain && !settings.customDomainUrl) {
        toast({
          title: "Error",
          description: "Please enter a custom domain",
          variant: "destructive",
        });
        return;
      }

      if (settings.customDomain && !domainValidation.isValid) {
        toast({
          title: "Error",
          description: domainValidation.message,
          variant: "destructive",
        });
        return;
      }

      if (settings.expirationEnabled && !settings.expirationDate) {
        toast({
          title: "Error",
          description: "Please select an expiration date",
          variant: "destructive",
        });
        return;
      }

      if (settings.passwordEnabled && !settings.passwordValue) {
        toast({
          title: "Error",
          description: "Please enter a password",
          variant: "destructive",
        });
        return;
      }

      // Prepare update data
      const updateData: any = {
        analytics_enabled: settings.analyticsEnabled
      };

      if (settings.customDomain) {
        updateData.custom_domain = settings.customDomainUrl;
      } else {
        updateData.custom_domain = null;
      }

      if (settings.expirationEnabled && settings.expirationDate) {
        updateData.expires_at = convertISTToUTC(settings.expirationDate).toISOString();
      } else {
        updateData.expires_at = null;
      }

      if (settings.passwordEnabled && settings.passwordValue) {
        // Hash the password using SHA-256
        const encoder = new TextEncoder();
        const data = encoder.encode(settings.passwordValue);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        updateData.password_hash = hashHex;
      } else {
        updateData.password_hash = null;
      }

      // Update the link in database
      const { error } = await supabase
        .from('links')
        .update(updateData)
        .eq('id', link.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Link settings updated successfully",
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating link settings:', error);
      toast({
        title: "Error",
        description: "Failed to update link settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!link) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Link Settings</DialogTitle>
          <DialogDescription>
            Update settings for your shortened URL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Custom Domain */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <Label htmlFor="custom-domain">Use Custom Domain</Label>
              </div>
              <Switch
                id="custom-domain"
                checked={settings.customDomain}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, customDomain: checked }))}
              />
            </div>
            {settings.customDomain && (
              <div className="space-y-2">
                <Input
                  placeholder="yourdomain.com"
                  value={settings.customDomainUrl}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, customDomainUrl: e.target.value }));
                    validateDomain(e.target.value);
                  }}
                  className={cn(
                    domainValidation.isValid ? '' : 'border-red-500'
                  )}
                />
                {domainValidation.message && (
                  <p className={cn(
                    "text-sm",
                    domainValidation.isValid ? "text-green-600" : "text-red-600"
                  )}>
                    {domainValidation.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <Label htmlFor="analytics">Enable Analytics</Label>
            </div>
            <Switch
              id="analytics"
              checked={settings.analyticsEnabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, analyticsEnabled: checked }))}
            />
          </div>

          {/* Expiration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4" />
                <Label htmlFor="expiration">Set Expiration</Label>
              </div>
              <Switch
                id="expiration"
                checked={settings.expirationEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, expirationEnabled: checked }))}
              />
            </div>
            {settings.expirationEnabled && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !settings.expirationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {settings.expirationDate ? (
                      format(settings.expirationDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={settings.expirationDate}
                    onSelect={(date) => setSettings(prev => ({ ...prev, expirationDate: date }))}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Password Protection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <Label htmlFor="password">Password Protection</Label>
              </div>
              <Switch
                id="password"
                checked={settings.passwordEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, passwordEnabled: checked }))}
              />
            </div>
            {settings.passwordEnabled && (
              <Input
                type="password"
                placeholder="Enter password"
                value={settings.passwordValue}
                onChange={(e) => setSettings(prev => ({ ...prev, passwordValue: e.target.value }))}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
