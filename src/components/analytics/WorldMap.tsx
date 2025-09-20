import { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Globe, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CountryData {
  country: string;
  countryCode: string;
  clicks: number;
  percentage: number;
  flag: string;
}

interface CityData {
  city: string;
  country: string;
  clicks: number;
  percentage: number;
}

interface WorldMapProps {
  linkId: string;
  recentActivity?: any[];
  onCountrySelect?: (country: string) => void;
}

const WorldMap = ({ linkId, recentActivity, onCountrySelect }: WorldMapProps) => {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [filteredCities, setFilteredCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);

  // Component rendered

  // Helper function to get country code from country name
  const getCountryCodeFromName = (countryName: string): string | null => {
    const countryNameToCode: { [key: string]: string } = {
      'India': 'IN',
      'United States': 'US',
      'United Kingdom': 'GB',
      'Germany': 'DE',
      'France': 'FR',
      'Canada': 'CA',
      'Australia': 'AU',
      'Brazil': 'BR',
      'Japan': 'JP',
      'China': 'CN',
      'Russia': 'RU',
      'Italy': 'IT',
      'Spain': 'ES',
      'Netherlands': 'NL',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Finland': 'FI',
      'Poland': 'PL',
      'Turkey': 'TR',
      'Argentina': 'AR',
      'Mexico': 'MX',
      'Indonesia': 'ID',
      'Thailand': 'TH',
      'Vietnam': 'VN',
      'Philippines': 'PH',
      'Malaysia': 'MY',
      'Singapore': 'SG',
      'Hong Kong': 'HK',
      'United Arab Emirates': 'AE',
      'Saudi Arabia': 'SA',
      'Egypt': 'EG',
      'South Africa': 'ZA',
      'Nigeria': 'NG',
      'Kenya': 'KE',
      'Morocco': 'MA',
      'Tunisia': 'TN',
      'Algeria': 'DZ',
      'Libya': 'LY',
      'Sudan': 'SD',
      'Ethiopia': 'ET',
      'Uganda': 'UG',
      'Tanzania': 'TZ',
      'Ghana': 'GH',
      'Ivory Coast': 'CI',
      'Senegal': 'SN',
      'Mali': 'ML',
      'Burkina Faso': 'BF',
      'Niger': 'NE',
      'Chad': 'TD',
      'Cameroon': 'CM',
      'Central African Republic': 'CF',
      'Democratic Republic of the Congo': 'CD',
      'Angola': 'AO',
      'Zambia': 'ZM',
      'Zimbabwe': 'ZW',
      'Botswana': 'BW',
      'Namibia': 'NA',
      'Swaziland': 'SZ',
      'Lesotho': 'LS',
      'Malawi': 'MW',
      'Mozambique': 'MZ',
      'Madagascar': 'MG',
      'Mauritius': 'MU',
      'Seychelles': 'SC',
      'Comoros': 'KM',
      'Djibouti': 'DJ',
      'Somalia': 'SO',
      'Eritrea': 'ER',
      'South Sudan': 'SS'
    };
    
    return countryNameToCode[countryName] || null;
  };

  // Country flag emojis mapping
  const countryFlags: { [key: string]: string } = {
    'IN': '🇮🇳',
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'CA': '🇨🇦',
    'AU': '🇦🇺',
    'BR': '🇧🇷',
    'JP': '🇯🇵',
    'CN': '🇨🇳',
    'RU': '🇷🇺',
    'IT': '🇮🇹',
    'ES': '🇪🇸',
    'NL': '🇳🇱',
    'SE': '🇸🇪',
    'NO': '🇳🇴',
    'DK': '🇩🇰',
    'FI': '🇫🇮',
    'PL': '🇵🇱',
    'TR': '🇹🇷',
    'AR': '🇦🇷',
    'MX': '🇲🇽',
    'ID': '🇮🇩',
    'TH': '🇹🇭',
    'VN': '🇻🇳',
    'PH': '🇵🇭',
    'MY': '🇲🇾',
    'SG': '🇸🇬',
    'HK': '🇭🇰',
    'AE': '🇦🇪',
    'SA': '🇸🇦',
    'EG': '🇪🇬',
    'ZA': '🇿🇦',
    'NG': '🇳🇬',
    'KE': '🇰🇪',
    'MA': '🇲🇦',
    'TN': '🇹🇳',
    'DZ': '🇩🇿',
    'LY': '🇱🇾',
    'SD': '🇸🇩',
    'ET': '🇪🇹',
    'UG': '🇺🇬',
    'TZ': '🇹🇿',
    'GH': '🇬🇭',
    'CI': '🇨🇮',
    'SN': '🇸🇳',
    'ML': '🇲🇱',
    'BF': '🇧🇫',
    'NE': '🇳🇪',
    'TD': '🇹🇩',
    'CM': '🇨🇲',
    'CF': '🇨🇫',
    'CD': '🇨🇩',
    'AO': '🇦🇴',
    'ZM': '🇿🇲',
    'ZW': '🇿🇼',
    'BW': '🇧🇼',
    'NA': '🇳🇦',
    'SZ': '🇸🇿',
    'LS': '🇱🇸',
    'MW': '🇲🇼',
    'MZ': '🇲🇿',
    'MG': '🇲🇬',
    'MU': '🇲🇺',
    'SC': '🇸🇨',
    'KM': '🇰🇲',
    'DJ': '🇩🇯',
    'SO': '🇸🇴',
    'ER': '🇪🇷',
    'SS': '🇸🇸'
  };

  // Fetch countries and cities data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch clicks data for this link
        const { data: clicksData, error } = await supabase
          .from('clicks')
          .select('country, city, country_name')
          .eq('link_id', linkId);

        if (error) throw error;

        console.log('WorldMap - Clicks data:', clicksData);

        // Process countries data
        const countryCounts: { [key: string]: { clicks: number; countryCode: string } } = {};
        const cityCounts: { [key: string]: { clicks: number; country: string } } = {};

        clicksData?.forEach(click => {
          if (click.country) {
            // Use country_name if available, otherwise use country
            const countryKey = click.country_name || click.country;
            console.log('WorldMap - Processing click:', { country: click.country, country_name: click.country_name, city: click.city });
            
            if (!countryCounts[countryKey]) {
              // Try to get country code from country name or use a default mapping
              const countryCode = getCountryCodeFromName(countryKey) || 'XX';
              countryCounts[countryKey] = { clicks: 0, countryCode };
            }
            countryCounts[countryKey].clicks += 1;

            if (click.city) {
              const cityKey = `${click.city}, ${countryKey}`;
              if (!cityCounts[cityKey]) {
                cityCounts[cityKey] = { clicks: 0, country: countryKey };
              }
              cityCounts[cityKey].clicks += 1;
            }
          }
        });

        // If no real data, try to use recent activity data or create mock data
        if (Object.keys(countryCounts).length === 0) {
          console.log('No real data found, trying to use recent activity data');
          
          // Try to use recent activity data if available
          if (recentActivity && recentActivity.length > 0) {
            console.log('Using recent activity data:', recentActivity);
            recentActivity.forEach(activity => {
              if (activity.country) {
                // Use country_name if available, otherwise use country
                const countryKey = activity.country_name || activity.country;
                console.log('WorldMap - Processing recent activity:', { country: activity.country, country_name: activity.country_name, city: activity.city });
                
                if (!countryCounts[countryKey]) {
                  const countryCode = getCountryCodeFromName(countryKey) || 'XX';
                  countryCounts[countryKey] = { clicks: 0, countryCode };
                }
                countryCounts[countryKey].clicks += 1;

                if (activity.city) {
                  const cityKey = `${activity.city}, ${countryKey}`;
                  if (!cityCounts[cityKey]) {
                    cityCounts[cityKey] = { clicks: 0, country: countryKey };
                  }
                  cityCounts[cityKey].clicks += 1;
                }
              }
            });
          }
          
          // No mock data - only show real data
        }

        // Get top 10 countries
        const totalClicks = Object.values(countryCounts).reduce((sum, country) => sum + country.clicks, 0);
        const topCountries = Object.entries(countryCounts)
          .map(([country, data]) => ({
            country,
            countryCode: data.countryCode,
            clicks: data.clicks,
            percentage: totalClicks > 0 ? (data.clicks / totalClicks) * 100 : 0,
            flag: countryFlags[data.countryCode] || '🌍'
          }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 10);

        // Get top 10 cities
        const topCities = Object.entries(cityCounts)
          .map(([city, data]) => ({
            city: city.split(', ')[0],
            country: data.country,
            clicks: data.clicks,
            percentage: totalClicks > 0 ? (data.clicks / totalClicks) * 100 : 0
          }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 10);

        console.log('WorldMap - Processed data:', {
          topCountries,
          topCities,
          totalClicks
        });

        setCountries(topCountries);
        setCities(topCities);
        setFilteredCities(topCities);
      } catch (error) {
        console.error('Error fetching map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [linkId]);

  const handleCountryClick = (country: string) => {
    console.log('Country clicked:', country);
    setSelectedCountry(country);
    const countryCities = cities.filter(city => city.country === country);
    console.log('Filtered cities for', country, ':', countryCities);
    setFilteredCities(countryCities);
    if (onCountrySelect) {
      onCountrySelect(country);
    }
  };

  const handleCountryReset = () => {
    setSelectedCountry(null);
    setFilteredCities(cities);
  };

    // Render state updated

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Globe className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p className="text-muted-foreground">Loading map data...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* World Map */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Visitor Map</h3>
          {selectedCountry && (
            <Button variant="outline" size="sm" onClick={handleCountryReset}>
              Reset View
            </Button>
          )}
        </div>
        
        <div className="h-96 relative bg-muted/20 rounded-lg overflow-hidden">
          <ComposableMap
            projectionConfig={{
              scale: 120,
              center: [0, 20]
            }}
            className="w-full h-full"
          >
            <ZoomableGroup>
              <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@3/world/110m.json">
                {({ geographies }) => {
                  console.log('WorldMap - Rendering geographies:', geographies.length);
                  console.log('WorldMap - Countries data:', countries);
                  
                  return geographies.map((geo) => {
                    const countryName = geo.properties.NAME || geo.properties.NAME_EN || geo.properties.NAME_LONG;
                    const countryData = countries.find(c => {
                      // Try multiple matching strategies
                      return c.country === countryName || 
                             c.country === geo.properties.NAME_LONG ||
                             c.country === geo.properties.NAME_EN ||
                             c.countryCode === geo.properties.ISO_A2 ||
                             c.countryCode === geo.properties.ISO_A3;
                    });
                    const isSelected = selectedCountry === countryName;
                    const hasData = countryData && countryData.clicks > 0;
                    
                    console.log('WorldMap - Country:', countryName, 'Data:', countryData, 'HasData:', hasData);
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={
                          isSelected 
                            ? "#3b82f6" 
                            : hasData 
                              ? "#10b981" 
                              : "#e5e7eb"
                        }
                        stroke="#ffffff"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { 
                            outline: "none",
                            fill: isSelected ? "#2563eb" : hasData ? "#059669" : "#d1d5db",
                            cursor: "pointer"
                          },
                          pressed: { outline: "none" }
                        }}
                        onClick={() => {
                          if (hasData) {
                            handleCountryClick(countryName);
                          }
                        }}
                      />
                    );
                  });
                }}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
          
          
          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 border">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Has clicks</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-300 rounded"></div>
                <span>No data</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Countries and Cities Data */}
      <Card className="p-6">
        <Tabs defaultValue="countries" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="countries">Countries</TabsTrigger>
            <TabsTrigger value="cities">Cities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="countries" className="mt-4">
            <div className="space-y-2">
              {countries.map((country, index) => (
                <div
                  key={country.country}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedCountry === country.country 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'bg-muted/50 hover:bg-muted/70'
                  }`}
                  onClick={() => handleCountryClick(country.country)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{country.flag}</span>
                    <div>
                      <p className="font-medium">{country.country}</p>
                      <p className="text-sm text-muted-foreground">
                        {country.clicks} clicks ({country.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    #{index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="cities" className="mt-4">
            <div className="space-y-2">
              {filteredCities.length > 0 ? (
                filteredCities.map((city, index) => (
                  <div
                    key={`${city.city}-${city.country}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{city.city}</p>
                        <p className="text-sm text-muted-foreground">{city.country}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{city.clicks}</p>
                      <p className="text-sm text-muted-foreground">
                        {city.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>
                    {selectedCountry 
                      ? `No city data available for ${selectedCountry}` 
                      : 'Select a country to view cities'
                    }
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default WorldMap;
