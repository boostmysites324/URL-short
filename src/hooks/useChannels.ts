import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

export interface Channel {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  link_count?: number;
}

export const useChannels = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchChannels = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('channels')
        .select(`
          *,
          link_count:links(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process the data to include link_count
      const processedChannels = data?.map(channel => ({
        ...channel,
        link_count: channel.link_count?.[0]?.count || 0
      })) || [];

      setChannels(processedChannels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: "Error",
        description: "Failed to fetch channels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async (name: string, description: string, color: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('channels')
        .insert({
          user_id: user.id,
          name,
          description,
          color
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Channel created",
        description: `Channel "${name}" has been created`,
      });

      await fetchChannels();
      return data;
    } catch (error: any) {
      console.error('Error creating channel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create channel",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateChannel = async (channelId: string, updates: Partial<Channel>) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('channels')
        .update(updates)
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: "Channel updated",
        description: "Channel has been updated successfully",
      });

      await fetchChannels();
    } catch (error: any) {
      console.error('Error updating channel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update channel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteChannel = async (channelId: string) => {
    try {
      setLoading(true);
      
      // First, remove channel from all links
      await supabase
        .from('links')
        .update({ channel_id: null })
        .eq('channel_id', channelId);

      // Then delete the channel
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: "Channel deleted",
        description: "Channel has been removed",
      });

      await fetchChannels();
    } catch (error: any) {
      console.error('Error deleting channel:', error);
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [user]);

  return {
    channels,
    loading,
    createChannel,
    updateChannel,
    deleteChannel,
    refreshChannels: fetchChannels
  };
};
