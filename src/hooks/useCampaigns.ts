import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
  link_count?: number;
}

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          link_count:links(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process the data to include link_count
      const processedCampaigns = data?.map(campaign => ({
        ...campaign,
        link_count: campaign.link_count?.[0]?.count || 0
      })) || [];

      setCampaigns(processedCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData: Omit<Campaign, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'link_count'>) => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          ...campaignData
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Campaign created",
        description: `Campaign "${campaignData.name}" has been created`,
      });

      await fetchCampaigns();
      return data;
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCampaign = async (campaignId: string, updates: Partial<Campaign>) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Campaign updated",
        description: "Campaign has been updated successfully",
      });

      await fetchCampaigns();
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      setLoading(true);
      
      // First, remove campaign from all links
      await supabase
        .from('links')
        .update({ campaign_id: null })
        .eq('campaign_id', campaignId);

      // Then delete the campaign
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Campaign deleted",
        description: "Campaign has been removed",
      });

      await fetchCampaigns();
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  return {
    campaigns,
    loading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    refreshCampaigns: fetchCampaigns
  };
};
