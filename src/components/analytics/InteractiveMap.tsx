import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, TrendingUp, Users, AlertCircle } from 'lucide-react';

interface CountryData {
  country: string;
  countryCode: string;
  clicks: number;
  percentage: number;
}

interface InteractiveMapProps {
  mapType: 'world' | 'india' | 'usa';
  countryData: CountryData[];
  title: string;
  description: string;
  color: string;
  onCountrySelect?: (country: string, data: CountryData) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  mapType,
  countryData,
  title,
  description,
  color,
  onCountrySelect
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; country: string; clicks: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Map URLs for different regions
  const getMapUrl = () => {
    switch (mapType) {
      case 'world':
        return 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
      case 'india':
        return 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
      case 'usa':
        return 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
      default:
        return 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setMapError(null);
  }, [mapType]);

  // Get geography feature properties based on map type
  const getGeographyProperties = (geo: any) => {
    switch (mapType) {
      case 'world':
        return {
          name: geo.properties.NAME,
          code: geo.properties.ISO_A2
        };
      case 'india':
        return {
          name: geo.properties.NAME_1,
          code: geo.properties.ST_CODE
        };
      case 'usa':
        return {
          name: geo.properties.NAME,
          code: geo.properties.STUSPS
        };
      default:
        return {
          name: geo.properties.NAME || geo.properties.NAME_1,
          code: geo.properties.ISO_A2 || geo.properties.ST_CODE
        };
    }
  };

  // Find country data by name or code
  const findCountryData = (geo: any) => {
    const props = getGeographyProperties(geo);
    return countryData.find(
      (data) => 
        data.country.toLowerCase() === props.name.toLowerCase() ||
        data.countryCode.toLowerCase() === props.code.toLowerCase()
    );
  };

  // Get fill color based on click data
  const getFillColor = (geo: any) => {
    const data = findCountryData(geo);
    if (!data) return '#E5E7EB';
    
    const intensity = Math.min(data.clicks / 100, 1); // Normalize to 0-1
    const opacity = 0.3 + (intensity * 0.7); // 0.3 to 1.0 opacity
    
    switch (mapType) {
      case 'india':
        return `rgba(249, 115, 22, ${opacity})`; // Orange
      case 'usa':
        return `rgba(16, 185, 129, ${opacity})`; // Emerald
      default:
        return `rgba(147, 51, 234, ${opacity})`; // Purple
    }
  };

  const handleCountryClick = (geo: any) => {
    try {
      const props = getGeographyProperties(geo);
      const data = findCountryData(geo);
      
      setSelectedCountry(props.name);
      
      if (data) {
        onCountrySelect?.(props.name, data);
      } else {
        // Handle case where no data exists for the country
        console.log(`No data found for ${props.name}`);
      }
    } catch (error) {
      console.error('Error handling country click:', error);
      setMapError('Error processing country selection');
    }
  };

  const handleMouseEnter = (geo: any, event: any) => {
    const props = getGeographyProperties(geo);
    const data = findCountryData(geo);
    
    if (data) {
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        country: props.name,
        clicks: data.clicks
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  if (mapError) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-inner border-2 border-dashed border-red-200">
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Map Loading Error</h3>
          <p className="text-red-600 mb-4">{mapError}</p>
          <button 
            onClick={() => {
              setMapError(null);
              setIsLoading(true);
            }}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-white rounded-xl p-4 shadow-inner border-2 border-dashed border-gray-200">
        <div className="h-96 w-full">
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          )}
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: mapType === 'world' ? 120 : 800,
              center: mapType === 'world' ? [0, 20] : mapType === 'india' ? [78, 20] : [-95, 40]
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup>
              <Geographies 
                geography={getMapUrl()}
                onReady={() => setIsLoading(false)}
              >
                {({ geographies }) => {
                  if (geographies.length === 0) {
                    setIsLoading(false);
                    return (
                      <text x="50%" y="50%" textAnchor="middle" fill="#666">
                        No map data available
                      </text>
                    );
                  }
                  
                  return geographies.map((geo) => {
                    const props = getGeographyProperties(geo);
                    const data = findCountryData(geo);
                    const isSelected = selectedCountry === props.name;
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={(event) => handleMouseEnter(geo, event)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleCountryClick(geo)}
                        style={{
                          default: {
                            fill: getFillColor(geo),
                            stroke: isSelected ? '#000' : '#D1D5DB',
                            strokeWidth: isSelected ? 2 : 0.5,
                            outline: 'none',
                          },
                          hover: {
                            fill: data ? (mapType === 'india' ? '#FB923C' : mapType === 'usa' ? '#10B981' : '#A855F7') : '#F3F4F6',
                            stroke: '#000',
                            strokeWidth: 1,
                            outline: 'none',
                          },
                          pressed: {
                            fill: data ? (mapType === 'india' ? '#EA580C' : mapType === 'usa' ? '#059669' : '#7C3AED') : '#E5E7EB',
                            stroke: '#000',
                            strokeWidth: 2,
                            outline: 'none',
                          },
                        }}
                      />
                    );
                  });
                }}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </div>
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
          }}
        >
          <div className="font-medium">{tooltip.country}</div>
          <div className="text-sm text-gray-300">{tooltip.clicks} clicks</div>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
