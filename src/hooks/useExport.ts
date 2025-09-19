import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

export interface ExportOptions {
  format: 'csv' | 'json';
  dateRange?: {
    start: string;
    end: string;
  };
  includeAnalytics?: boolean;
  linkIds?: string[];
}

export const useExport = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const exportLinks = async (options: ExportOptions) => {
    if (!user) return;

    try {
      setLoading(true);

      // Build query
      let query = supabase
        .from('links')
        .select(`
          *,
          channels(name),
          campaigns(name),
          analytics_daily(date, total_clicks, unique_clicks)
        `)
        .eq('user_id', user.id);

      // Apply filters
      if (options.linkIds && options.linkIds.length > 0) {
        query = query.in('id', options.linkIds);
      }

      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start)
          .lte('created_at', options.dateRange.end);
      }

      const { data: links, error } = await query;

      if (error) throw error;

      if (options.format === 'csv') {
        exportToCSV(links || [], options.includeAnalytics);
      } else {
        exportToJSON(links || [], options.includeAnalytics);
      }

      toast({
        title: "Export completed",
        description: `Links exported successfully`,
      });

    } catch (error: any) {
      console.error('Error exporting links:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to export links",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (links: any[], includeAnalytics: boolean = false) => {
    const headers = [
      'Short URL',
      'Original URL',
      'Title',
      'Description',
      'Channel',
      'Campaign',
      'Status',
      'Created At',
      'Expires At',
      'Total Clicks',
      'Unique Clicks'
    ];

    if (includeAnalytics) {
      headers.push('Analytics Data');
    }

    const csvContent = [
      headers.join(','),
      ...links.map(link => {
        const analyticsData = link.analytics_daily || [];
        const totalClicks = analyticsData.reduce((sum: number, day: any) => sum + (day.total_clicks || 0), 0);
        const uniqueClicks = analyticsData.reduce((sum: number, day: any) => sum + (day.unique_clicks || 0), 0);

        const row = [
          `"${link.short_url}"`,
          `"${link.original_url}"`,
          `"${link.title || ''}"`,
          `"${link.description || ''}"`,
          `"${link.channels?.name || ''}"`,
          `"${link.campaigns?.name || ''}"`,
          `"${link.status}"`,
          `"${link.created_at}"`,
          `"${link.expires_at || ''}"`,
          totalClicks,
          uniqueClicks
        ];

        if (includeAnalytics) {
          const analyticsJson = JSON.stringify(analyticsData);
          row.push(`"${analyticsJson}"`);
        }

        return row.join(',');
      })
    ].join('\n');

    downloadFile(csvContent, 'links-export.csv', 'text/csv');
  };

  const exportToJSON = (links: any[], includeAnalytics: boolean = false) => {
    const exportData = links.map(link => {
      const analyticsData = link.analytics_daily || [];
      const totalClicks = analyticsData.reduce((sum: number, day: any) => sum + (day.total_clicks || 0), 0);
      const uniqueClicks = analyticsData.reduce((sum: number, day: any) => sum + (day.unique_clicks || 0), 0);

      return {
        shortUrl: link.short_url,
        originalUrl: link.original_url,
        title: link.title,
        description: link.description,
        channel: link.channels?.name,
        campaign: link.campaigns?.name,
        status: link.status,
        createdAt: link.created_at,
        expiresAt: link.expires_at,
        totalClicks,
        uniqueClicks,
        ...(includeAnalytics && { analytics: analyticsData })
      };
    });

    downloadFile(JSON.stringify(exportData, null, 2), 'links-export.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    loading,
    exportLinks
  };
};
