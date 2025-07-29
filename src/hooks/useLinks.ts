import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Link {
  id: string;
  original_url: string;
  short_code: string;
  short_url: string;
  title?: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  expires_at?: string;
  analytics_enabled: boolean;
  total_clicks?: number;
  unique_clicks?: number;
}

export interface LinkSettings {
  customDomain?: string;
  analyticsEnabled: boolean;
  expiresAt?: string;
  password?: string;
}

export const useLinks = () => {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLinks = async () => {
    try {
      setLoading(true);
      
      // Get links with click counts
      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select(`
          *,
          analytics_daily(
            total_clicks,
            unique_clicks
          )
        `)
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;

      // Process links to include total click counts
      const processedLinks = linksData?.map(link => {
        const totalClicks = link.analytics_daily?.reduce((sum: number, day: any) => sum + (day.total_clicks || 0), 0) || 0;
        const uniqueClicks = link.analytics_daily?.reduce((sum: number, day: any) => sum + (day.unique_clicks || 0), 0) || 0;
        
        return {
          ...link,
          total_clicks: totalClicks,
          unique_clicks: uniqueClicks
        };
      }) || [];

      setLinks(processedLinks);
    } catch (error) {
      console.error('Error fetching links:', error);
      toast({
        title: "Error",
        description: "Failed to fetch links",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const shortenUrl = async (url: string, settings: LinkSettings = { analyticsEnabled: true }) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('shorten-url', {
        body: {
          url,
          customDomain: settings.customDomain,
          expiresAt: settings.expiresAt,
          password: settings.password,
          analyticsEnabled: settings.analyticsEnabled
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success!",
          description: "Link shortened successfully",
        });
        
        // Refresh links list
        await fetchLinks();
        
        return data.data;
      } else {
        throw new Error(data?.error || 'Failed to shorten URL');
      }
    } catch (error) {
      console.error('Error shortening URL:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to shorten URL",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Link deleted successfully",
      });

      // Refresh links list
      await fetchLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({
        title: "Error",
        description: "Failed to delete link",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchLinks();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('links-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'links'
      }, () => {
        fetchLinks();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'analytics_daily'
      }, () => {
        fetchLinks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    links,
    loading,
    shortenUrl,
    deleteLink,
    refreshLinks: fetchLinks
  };
};