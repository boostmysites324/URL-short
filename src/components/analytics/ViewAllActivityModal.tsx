import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  X, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Chrome, 
  Globe, 
  User, 
  Calendar as CalendarIcon,
  Clock
} from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  link_id: string;
  ip_address: string;
  user_agent: string;
  country: string;
  country_name: string;
  city: string;
  device_type: string;
  browser_type: string;
  browser_version: string;
  os_type: string;
  os_version: string;
  referer: string;
  created_at: string;
  links?: {
    short_code: string;
    original_url: string;
  };
}

interface ViewAllActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkId: string;
  linkUrl: string;
}

const ViewAllActivityModal = ({ isOpen, onClose, linkId, linkUrl }: ViewAllActivityModalProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [countryFilter, setCountryFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const itemsPerPage = 10;

  // Get unique values for filter dropdowns
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]);
  const [uniqueDevices, setUniqueDevices] = useState<string[]>([]);

  const fetchActivities = async (page: number = 1) => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('ViewAllActivityModal - No user found');
        setLoading(false);
        return;
      }
      
      console.log('ViewAllActivityModal - Starting fetch for user:', user.id);
      
      let query;
      
      if (linkId) {
        // For individual link, use the complex query with joins
        query = supabase
          .from('clicks')
          .select(`
            *,
            links!inner(
              user_id,
              short_code,
              original_url
            )
          `, { count: 'exact' })
          .eq('links.user_id', user.id)
          .eq('link_id', linkId)
          .order('created_at', { ascending: false });
      } else {
        // For global statistics, use the same approach as individual links but without linkId filter
        query = supabase
          .from('clicks')
          .select(`
            *,
            links!inner(
              user_id,
              short_code,
              original_url
            )
          `, { count: 'exact' })
          .eq('links.user_id', user.id)
          .order('created_at', { ascending: false });
      }

      // Apply filters
      if (countryFilter !== 'all') {
        // Try to match both country and country_name fields
        query = query.or(`country.eq.${countryFilter},country_name.eq.${countryFilter}`);
      }
      
      if (deviceFilter !== 'all') {
        query = query.eq('device_type', deviceFilter);
      }
      
      if (dateRange.from) {
        query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
      }
      
      if (dateRange.to) {
        query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
      }

      // Pagination
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      console.log('ViewAllActivityModal - Executing query with pagination:', {
        from,
        to,
        linkId,
        page
      });

      const { data, error, count } = await query;

      if (error) {
        console.error('ViewAllActivityModal - Error fetching activities:', error);
        throw error;
      }

      console.log('ViewAllActivityModal - Fetched activities:', {
        data,
        count,
        linkId,
        page,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      });

      // Data is already enriched with links relation, so use it directly
      setActivities(data || []);
      
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
      // Update unique values for filters
      if (page === 1) {
        let filterQuery;
        
        if (linkId) {
          filterQuery = supabase
            .from('clicks')
            .select('country, country_name, device_type')
            .eq('link_id', linkId);
        } else {
          // For global statistics, use the same approach as individual links
          filterQuery = supabase
            .from('clicks')
            .select(`
              country, 
              country_name, 
              device_type,
              links!inner(
                user_id
              )
            `)
            .eq('links.user_id', user.id);
        }

        const { data: allData, error: filterError } = await filterQuery;
        
        if (filterError) {
          console.error('ViewAllActivityModal - Error fetching filter data:', filterError);
        }
        
        console.log('ViewAllActivityModal - Filter data:', {
          allData,
          linkId,
          user: user?.id
        });
        
        if (allData) {
          // Use country_name if available, otherwise fall back to country
          const countries = [...new Set(allData.map(item => item.country_name || item.country).filter(Boolean))] as string[];
          const devices = [...new Set(allData.map(item => item.device_type).filter(Boolean))] as string[];
          setUniqueCountries(countries);
          setUniqueDevices(devices);
        }
      }
    } catch (error) {
      console.error('ViewAllActivityModal - Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('ViewAllActivityModal - useEffect triggered:', {
      isOpen,
      linkId,
      countryFilter,
      deviceFilter,
      dateRange
    });
    
    if (isOpen) {
      console.log('ViewAllActivityModal - Opening modal, fetching activities...');
      // Add a small delay to ensure modal is fully open
      setTimeout(() => {
        fetchActivities(1);
        setCurrentPage(1);
      }, 100);
    }
  }, [isOpen, linkId, countryFilter, deviceFilter, dateRange]);

  const handleFilter = () => {
    setCurrentPage(1);
    fetchActivities(1);
  };

  const handleClearFilters = () => {
    setCountryFilter('all');
    setDeviceFilter('all');
    setDateRange({
      from: subDays(new Date(), 30),
      to: new Date()
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchActivities(page);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      case 'desktop':
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getBrowserIcon = (browser: string) => {
    switch (browser?.toLowerCase()) {
      case 'chrome':
        return <Chrome className="w-4 h-4" />;
      case 'firefox':
        return <Globe className="w-4 h-4" />;
      case 'safari':
        return <Globe className="w-4 h-4" />;
      case 'edge':
        return <Globe className="w-4 h-4" />;
      case 'opera':
        return <Globe className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getCountryFlag = (country: string) => {
    const flagMap: { [key: string]: string } = {
      'India': '🇮🇳',
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      'Germany': '🇩🇪',
      'France': '🇫🇷',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺',
      'Brazil': '🇧🇷',
      'Japan': '🇯🇵',
      'China': '🇨🇳'
    };
    return flagMap[country] || '🌍';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Recent Activity - {linkUrl}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            {linkId ? 'View and filter all click activity for this shortened URL' : 'View and filter all click activity from all your links'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Filters</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  Clear All
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Country</label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {uniqueCountries.map(country => (
                        <SelectItem key={country} value={country}>
                          {getCountryFlag(country)} {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Device</label>
                  <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Devices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Devices</SelectItem>
                      {uniqueDevices.map(device => (
                        <SelectItem key={device} value={device}>
                          {getDeviceIcon(device)} {device}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Date From</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Date To</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {activities.length} of {totalCount} activities
              </div>
              <Button onClick={handleFilter} disabled={loading}>
                Apply Filters
              </Button>
            </div>
          </Card>

          {/* Activity List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading activities...</p>
                </div>
              </div>
            ) : activities.length > 0 ? (
              activities.map((activity, index) => (
                <Card key={activity.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getCountryFlag(activity.country_name || activity.country)}</span>
                        <span className="font-medium">
                          {activity.city ? `${activity.city}, ` : ''}
                          {activity.country_name || activity.country}
                        </span>
                      </div>
                      {activity.links && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-mono">{activity.links.original_url}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        {getDeviceIcon(activity.device_type)}
                        <span className="capitalize">{activity.device_type}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {getBrowserIcon(activity.browser_type)}
                        <span>{activity.browser_type}</span>
                      </div>
                      
                      {activity.referer && (
                        <div className="flex items-center space-x-1">
                          <Globe className="w-4 h-4" />
                          <span className="truncate max-w-[150px]">{activity.referer}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{activity.os_type}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No activities found for the selected filters</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewAllActivityModal;
