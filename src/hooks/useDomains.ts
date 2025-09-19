import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

export interface Domain {
  id: string;
  user_id: string;
  domain: string;
  verified: boolean;
  active: boolean;
  is_default: boolean;
  dns_verification_code: string;
  created_at: string;
  updated_at: string;
}

export const useDomains = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDomains = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
      toast({
        title: "Error",
        description: "Failed to fetch domains",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addDomain = async (domain: string) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Generate verification code
      const verificationCode = `swift-${Math.random().toString(36).substring(2, 15)}`;
      
      const { data, error } = await supabase
        .from('domains')
        .insert({
          user_id: user.id,
          domain: domain.toLowerCase(),
          dns_verification_code: verificationCode,
          verified: false,
          active: false,
          is_default: domains.length === 0 // First domain becomes default
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Domain added",
        description: `Please add the DNS record to verify ${domain}`,
      });

      await fetchDomains();
      return data;
    } catch (error: any) {
      console.error('Error adding domain:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add domain",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyDomain = async (domainId: string) => {
    try {
      setLoading(true);
      
      // Check DNS verification
      const domain = domains.find(d => d.id === domainId);
      if (!domain) throw new Error('Domain not found');

      // In a real implementation, you would check DNS records here
      // For now, we'll simulate verification
      const { error } = await supabase
        .from('domains')
        .update({
          verified: true,
          active: true
        })
        .eq('id', domainId);

      if (error) throw error;

      toast({
        title: "Domain verified",
        description: `${domain.domain} is now active`,
      });

      await fetchDomains();
    } catch (error: any) {
      console.error('Error verifying domain:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify domain",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setDefaultDomain = async (domainId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Remove default from all domains
      await supabase
        .from('domains')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set new default
      const { error } = await supabase
        .from('domains')
        .update({ is_default: true })
        .eq('id', domainId);

      if (error) throw error;

      toast({
        title: "Default domain updated",
        description: "Your default domain has been changed",
      });

      await fetchDomains();
    } catch (error: any) {
      console.error('Error setting default domain:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update default domain",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDomain = async (domainId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      toast({
        title: "Domain deleted",
        description: "Domain has been removed",
      });

      await fetchDomains();
    } catch (error: any) {
      console.error('Error deleting domain:', error);
      toast({
        title: "Error",
        description: "Failed to delete domain",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [user]);

  return {
    domains,
    loading,
    addDomain,
    verifyDomain,
    setDefaultDomain,
    deleteDomain,
    refreshDomains: fetchDomains
  };
};
