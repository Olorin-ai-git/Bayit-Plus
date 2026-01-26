import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, ZoomIn, ZoomOut, Layers, Filter, User, Building, Smartphone, CreditCard, AlertTriangle } from 'lucide-react';
import { ICON_REGISTRY } from '@olorin/shared-icons';

interface Location {
  id: string;
  lat: number;
  lng: number;
  type: 'customer' | 'business' | 'device' | 'transaction' | 'risk';
  title: string;
  description?: string;
  timestamp?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface LocationMapProps {
  locations: Location[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
  onLocationClick?: (location: Location) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  showControls?: boolean;
  showFilters?: boolean;
  clustered?: boolean;
}

const LocationMap: React.FC<LocationMapProps> = ({
  locations = [],
  center = { lat: 40.7128, lng: -74.0060 }, // NYC default
  zoom = 10,
  height = '400px',
  className = '',
  onLocationClick,
  onBoundsChange,
  showControls = true,
  showFilters = true,
  clustered = true,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [filteredTypes, setFilteredTypes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get marker style based on location type and risk level
  // Icons from unified system (@olorin/shared-icons)
  const getMarkerStyle = useCallback((location: Location) => {
    const baseStyles = {
      customer: { bg: 'bg-blue-500', icon: 'User', iconName: 'profile', border: 'border-blue-600' },
      business: { bg: 'bg-green-500', icon: 'Building', iconName: 'home', border: 'border-green-600' },
      device: { bg: 'bg-purple-500', icon: 'Smartphone', iconName: 'download', border: 'border-purple-600' },
      transaction: { bg: 'bg-orange-500', icon: 'CreditCard', iconName: 'plans', border: 'border-orange-600' },
      risk: { bg: 'bg-red-500', icon: 'AlertTriangle', iconName: 'error', border: 'border-red-600' },
    };

    const riskStyles = {
      low: { bg: 'bg-green-500', border: 'border-green-600' },
      medium: { bg: 'bg-yellow-500', border: 'border-yellow-600' },
      high: { bg: 'bg-orange-500', border: 'border-orange-600' },
      critical: { bg: 'bg-red-500', border: 'border-red-600' },
    };

    const base = baseStyles[location.type] || baseStyles.customer;
    const risk = location.riskLevel ? riskStyles[location.riskLevel] : null;

    return {
      ...base,
      ...(risk || {}),
    };
  }, []);

  // Filter locations based on selected types
  const filteredLocations = locations.filter(location =>
    filteredTypes.size === 0 || filteredTypes.has(location.type)
  );

  // Toggle location type filter
  const toggleFilter = useCallback((type: string) => {
    setFilteredTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  // Simulate map initialization and rendering
  useEffect(() => {
    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In a real implementation, this would initialize Google Maps or another map library
        // For now, we'll render a static representation
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load map');
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [center, zoom]);

  // Handle location click
  const handleLocationClick = useCallback((location: Location) => {
    setSelectedLocation(location);
    onLocationClick?.(location);
  }, [onLocationClick]);

  // Calculate map bounds when locations change
  useEffect(() => {
    if (filteredLocations.length > 0 && onBoundsChange) {
      const lats = filteredLocations.map(loc => loc.lat);
      const lngs = filteredLocations.map(loc => loc.lng);

      const bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      };

      onBoundsChange(bounds);
    }
  }, [filteredLocations, onBoundsChange]);

  // Get unique location types for filters
  const locationTypes = [...new Set(locations.map(loc => loc.type))];

  if (error) {
    return (
      <div className={`relative bg-gray-100 rounded-lg border border-gray-200 ${className}`} style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Map Error</h3>
            <p className="text-sm text-gray-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-100 rounded-lg border border-gray-200 overflow-hidden ${className}`} style={{ height }}>
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 z-10 space-y-2">
          <button className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors">
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <button className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors">
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <button className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors">
            <Navigation className="w-4 h-4 text-gray-600" />
          </button>
          <button className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors">
            <Layers className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* Location Type Filters */}
      {showFilters && locationTypes.length > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white rounded-lg shadow-md p-3 max-w-xs">
            <div className="flex items-center mb-2">
              <Filter className="w-4 h-4 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-900">Filter Locations</span>
            </div>
            <div className="space-y-1">
              {locationTypes.map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filteredTypes.size === 0 || filteredTypes.has(type)}
                    onChange={() => toggleFilter(type)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    ({locations.filter(loc => loc.type === type).length})
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full bg-gray-200 relative">
        {/* Static Map Representation (In production, this would be replaced by actual map) */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100">
          {/* Grid pattern to simulate map */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#999" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Location Markers */}
          {filteredLocations.map((location, index) => {
            const style = getMarkerStyle(location);
            // Calculate position based on lat/lng (simplified)
            const x = ((location.lng + 180) / 360) * 100;
            const y = ((90 - location.lat) / 180) * 100;

            return (
              <div
                key={location.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform hover:scale-110`}
                style={{
                  left: `${Math.max(5, Math.min(95, x))}%`,
                  top: `${Math.max(5, Math.min(95, y))}%`,
                }}
                onClick={() => handleLocationClick(location)}
              >
                <div className={`w-8 h-8 ${style.bg} ${style.border} border-2 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-lg`}>
                  <span className="text-xs">{style.icon}</span>
                </div>
                {selectedLocation?.id === location.id && (
                  <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-max z-20">
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"></div>
                    <h4 className="font-medium text-gray-900 mb-1">{location.title}</h4>
                    {location.description && (
                      <p className="text-sm text-gray-600 mb-2">{location.description}</p>
                    )}
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Type: <span className="capitalize">{location.type}</span></div>
                      {location.riskLevel && (
                        <div>Risk: <span className="capitalize font-medium">{location.riskLevel}</span></div>
                      )}
                      {location.timestamp && (
                        <div>Time: {new Date(location.timestamp).toLocaleString()}</div>
                      )}
                      <div>Coordinates: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Location Summary */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-white bg-opacity-90 backdrop-blur rounded-lg p-3 shadow-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {filteredLocations.length} of {locations.length} locations shown
            </span>
            {clustered && filteredLocations.length > 10 && (
              <span className="text-blue-600 font-medium">Clustering enabled</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;