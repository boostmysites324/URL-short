import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, TrendingUp, Globe, AlertCircle } from 'lucide-react';

interface CountryData {
  country: string;
  countryCode: string;
  clicks: number;
  percentage: number;
}

interface SimpleMapProps {
  mapType: 'india' | 'usa' | 'world';
  countryData: CountryData[];
  title: string;
  description: string;
  color: string;
  onCountrySelect?: (country: string, data: CountryData) => void;
}

const SimpleMap: React.FC<SimpleMapProps> = ({
  mapType,
  countryData,
  title,
  description,
  color,
  onCountrySelect
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const handleCountryClick = (country: CountryData) => {
    setSelectedCountry(country.country);
    onCountrySelect?.(country.country, country);
  };

  const getMapEmoji = () => {
    switch (mapType) {
      case 'india':
        return '🇮🇳';
      case 'usa':
        return '🇺🇸';
      case 'world':
        return '🌍';
      default:
        return '🗺️';
    }
  };

  const getMapTitle = () => {
    switch (mapType) {
      case 'india':
        return 'Indian States & Regions';
      case 'usa':
        return 'US States & Territories';
      case 'world':
        return 'Global Countries';
      default:
        return 'Geographic Regions';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-inner border border-gray-200">
      {/* Map Header */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">{getMapEmoji()}</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{getMapTitle()}</h3>
        <p className="text-gray-600 text-sm">Click on regions below to view analytics</p>
      </div>

      {/* Interactive Regions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {countryData.slice(0, 12).map((country, index) => {
          const isSelected = selectedCountry === country.country;
          const colorClasses = {
            india: {
              bg: 'bg-gradient-to-br from-orange-100 to-amber-100',
              border: 'border-orange-300',
              text: 'text-orange-800',
              selected: 'bg-gradient-to-br from-orange-200 to-amber-200 border-orange-400',
              hover: 'hover:from-orange-200 hover:to-amber-200'
            },
            usa: {
              bg: 'bg-gradient-to-br from-emerald-100 to-teal-100',
              border: 'border-emerald-300',
              text: 'text-emerald-800',
              selected: 'bg-gradient-to-br from-emerald-200 to-teal-200 border-emerald-400',
              hover: 'hover:from-emerald-200 hover:to-teal-200'
            },
            world: {
              bg: 'bg-gradient-to-br from-purple-100 to-violet-100',
              border: 'border-purple-300',
              text: 'text-purple-800',
              selected: 'bg-gradient-to-br from-purple-200 to-violet-200 border-purple-400',
              hover: 'hover:from-purple-200 hover:to-violet-200'
            }
          };

          const classes = colorClasses[mapType] || colorClasses.world;

          return (
            <button
              key={index}
              onClick={() => handleCountryClick(country)}
              className={`
                p-3 rounded-xl border-2 transition-all duration-200 transform hover:scale-105
                ${isSelected ? classes.selected : `${classes.bg} ${classes.border} ${classes.hover}`}
                ${classes.text}
              `}
            >
              <div className="text-center">
                <div className="font-bold text-sm mb-1 truncate" title={country.country}>
                  {country.country}
                </div>
                <div className="text-xs opacity-75">
                  {country.clicks} clicks
                </div>
                <div className="text-xs font-semibold mt-1">
                  {country.percentage.toFixed(1)}%
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Country Details */}
      {selectedCountry && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-gray-800">Selected: {selectedCountry}</h4>
            <button
              onClick={() => setSelectedCountry(null)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ✕ Close
            </button>
          </div>
          {countryData.find(c => c.country === selectedCountry) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Clicks:</span>
                <span className="font-semibold text-gray-800">
                  {countryData.find(c => c.country === selectedCountry)?.clicks}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Percentage:</span>
                <span className="font-semibold text-gray-800">
                  {countryData.find(c => c.country === selectedCountry)?.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    mapType === 'india' ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                    mapType === 'usa' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                    'bg-gradient-to-r from-purple-400 to-violet-500'
                  }`}
                  style={{ 
                    width: `${countryData.find(c => c.country === selectedCountry)?.percentage || 0}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Data Message */}
      {countryData.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No data available for this region</p>
        </div>
      )}
    </div>
  );
};

export default SimpleMap;
