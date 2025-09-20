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

  const fetchLinks = async (showLogs = false) => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLinks([]);
        return;
      }
      
      console.log('🔗🔄 fetchLinks called - showLogs:', showLogs, 'user:', user?.id);
      
      if (showLogs) {
        console.log('Fetching links for user:', user.id);
      }
      
      // Get links for current user only (exclude archived)
      const result = await (supabase as any)
        .from('links')
        .select('id, original_url, short_code, short_url, title, status, created_at, expires_at, analytics_enabled')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      
      const { data: linksData, error: linksError } = result;

      if (linksError) {
        console.error('Error fetching links:', linksError);
        throw linksError;
      }

      // Process links to include total click counts from actual clicks table
      const processedLinks = await Promise.all(linksData?.map(async (link) => {
        // Get actual click counts from clicks table
        const { data: clicksData, error: clicksError } = await supabase
          .from('clicks')
          .select('id, ip_address, clicked_at')
          .eq('link_id', link.id);
        
        if (clicksError) {
          console.error(`Error fetching clicks for link ${link.short_code}:`, clicksError);
        }
        
        const totalClicks = clicksData?.length || 0;
        
        // Calculate unique clicks based on IP address
        const uniqueIPs = new Set(clicksData?.map(click => click.ip_address).filter(Boolean) || []);
        const uniqueClicks = uniqueIPs.size;
        
        if (showLogs) {
          console.log(`Link ${link.short_code}: total=${totalClicks}, unique=${uniqueClicks}`);
        }
        
        return {
          ...link,
          total_clicks: totalClicks,
          unique_clicks: uniqueClicks
        };
      }) || []);

      console.log('🔗📊 Processed links with updated counts:', processedLinks.map(l => `${l.short_code}: ${l.total_clicks}/${l.unique_clicks}`));
      
      if (showLogs) {
        console.log('Processed links:', processedLinks);
      }
      setLinks(processedLinks);
      console.log('🔗✅ Links state updated with new counts');
      
      // Force a re-render to ensure UI updates
      if (processedLinks.length > 0) {
        console.log('🔗🔄 Forcing UI update for individual link cards');
      }
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
    // Initial fetch only - no automatic refreshes
    fetchLinks(true);

    // Set up real-time subscription for link updates
    console.log('🔗🔧 useLinks: Setting up links subscription');
    const linksSubscription = supabase
      .channel('links-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'clicks'
      }, (payload) => {
        console.log('🔗📊 useLinks: Real-time click detected:', payload);
        fetchLinks(false); // Refresh links when new clicks occur
      })
      .subscribe();
    console.log('🔗✅ useLinks: Links subscription established');
    
    return () => {
      supabase.removeChannel(linksSubscription);
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