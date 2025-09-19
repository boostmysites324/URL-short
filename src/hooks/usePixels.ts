import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

export interface Pixel {
  id: string;
  user_id: string;
  name: string;
  provider: 'facebook' | 'google' | 'twitter' | 'linkedin' | 'tiktok' | 'custom';
  pixel_id: string;
  script: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export const usePixels = () => {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPixels = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pixels')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPixels(data || []);
    } catch (error) {
      console.error('Error fetching pixels:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pixels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPixel = async (pixelData: Omit<Pixel, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pixels')
        .insert({
          user_id: user.id,
          ...pixelData
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Pixel created",
        description: `Pixel "${pixelData.name}" has been created`,
      });

      await fetchPixels();
      return data;
    } catch (error: any) {
      console.error('Error creating pixel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create pixel",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePixel = async (pixelId: string, updates: Partial<Pixel>) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('pixels')
        .update(updates)
        .eq('id', pixelId);

      if (error) throw error;

      toast({
        title: "Pixel updated",
        description: "Pixel has been updated successfully",
      });

      await fetchPixels();
    } catch (error: any) {
      console.error('Error updating pixel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update pixel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePixel = async (pixelId: string) => {
    try {
      setLoading(true);
      
      // Remove pixel from all links
      await supabase
        .from('link_pixels')
        .delete()
        .eq('pixel_id', pixelId);

      // Delete the pixel
      const { error } = await supabase
        .from('pixels')
        .delete()
        .eq('id', pixelId);

      if (error) throw error;

      toast({
        title: "Pixel deleted",
        description: "Pixel has been removed",
      });

      await fetchPixels();
    } catch (error: any) {
      console.error('Error deleting pixel:', error);
      toast({
        title: "Error",
        description: "Failed to delete pixel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePixelStatus = async (pixelId: string, status: 'active' | 'inactive') => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('pixels')
        .update({ status })
        .eq('id', pixelId);

      if (error) throw error;

      toast({
        title: `Pixel ${status}`,
        description: `Pixel has been ${status}`,
      });

      await fetchPixels();
    } catch (error: any) {
      console.error('Error toggling pixel status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update pixel status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPixels();
  }, [user]);

  return {
    pixels,
    loading,
    createPixel,
    updatePixel,
    deletePixel,
    togglePixelStatus,
    refreshPixels: fetchPixels
  };
};
