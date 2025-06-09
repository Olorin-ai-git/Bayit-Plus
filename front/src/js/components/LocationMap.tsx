import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import useConfig from '../hooks/useConfig';

interface Location {
  lat: number;
  lng: number;
  type: 'customer' | 'business' | 'phone' | 'rss' | 'device';
  timestamp?: string;
}

interface LocationMapProps {
  locations: Location[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

/**
 * LocationMap component displays various locations on a Google Map
 * @param {LocationMapProps} props - Component props containing location data
 * @returns {JSX.Element} The rendered map component
 */
const LocationMap = ({
  locations,
  center = { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
  zoom = 4,
}: LocationMapProps): JSX.Element => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const config = useConfig();
  const [error, setError] = useState<string | null>(null);

  // Define marker colors and icons for different location types
  const locationStyles = {
    customer: {
      color: '#4CAF50', // Green
      icon: '📍',
    },
    business: {
      color: '#2196F3', // Blue
      icon: '🏢',
    },
    phone: {
      color: '#9C27B0', // Purple
      icon: '📱',
    },
    rss: {
      color: '#FF9800', // Orange
      icon: '💻',
    },
    device: {
      color: '#F44336', // Red
      icon: '💻',
    },
  };

  useEffect(() => {
    /**
     * Initializes the Google Maps instance and adds markers
     * @returns {Promise<void>} A promise that resolves when the map is initialized
     */
    const initMap = async () => {
      const apiKey = config.googleMapsApiKey;
      if (!apiKey) {
        setError(
          'Google Maps API key is not configured. Please add it to the plugin configuration.',
        );
        return;
      }

      // Validate locations data
      const validLocations = locations.filter(
        (location) =>
          location &&
          typeof location.lat === 'number' &&
          typeof location.lng === 'number' &&
          location.type in locationStyles,
      );

      if (validLocations.length === 0) {
        setError('No valid locations provided to display on the map.');
        return;
      }

      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places'],
      });

      try {
        const google = await loader.load();

        if (mapRef.current && !mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center,
            zoom,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
          });
        }

        // Clear existing markers
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        // Add markers for each location
        validLocations.forEach((location) => {
          const marker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: mapInstanceRef.current,
            title: `${location.type} location${
              location.timestamp ? ` (${location.timestamp})` : ''
            }`,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: locationStyles[location.type].color,
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            },
          });

          // Add info window with location details
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                <strong>${
                  location.type.charAt(0).toUpperCase() + location.type.slice(1)
                } Location</strong>
                ${location.timestamp ? `<br>Time: ${location.timestamp}` : ''}
                <br>Lat: ${location.lat.toFixed(4)}
                <br>Lng: ${location.lng.toFixed(4)}
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstanceRef.current, marker);
          });

          markersRef.current.push(marker);
        });

        // Fit map bounds to show all markers
        if (validLocations.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          validLocations.forEach((location) => {
            bounds.extend({ lat: location.lat, lng: location.lng });
          });
          mapInstanceRef.current?.fitBounds(bounds);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        if (errorMessage.includes('InvalidKey')) {
          setError(
            'Invalid Google Maps API key. Please check that the key is valid and has the necessary permissions enabled.',
          );
        } else if (errorMessage.includes('RefererNotAllowedMapError')) {
          setError(
            'The Google Maps API key is not authorized for this domain. Please check the key restrictions.',
          );
        } else {
          setError(`Error loading Google Maps: ${errorMessage}`);
        }
      }
    };

    initMap();
  }, [locations, center, zoom, config.googleMapsApiKey]);

  if (error) {
    return (
      <div
        className="location-map-container"
        data-testid="location-map-container"
      >
        <div
          className="error-message"
          style={{
            padding: '20px',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '4px',
            color: '#991b1b',
            marginBottom: '10px',
          }}
        >
          {error}
        </div>
        <div className="location-legend">
          {Object.entries(locationStyles).map(([type, style]) => (
            <div key={type} className="legend-item">
              <span className="legend-icon" style={{ color: style.color }}>
                {style.icon}
              </span>
              <span className="legend-label">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="location-map-container"
      data-testid="location-map-container"
    >
      <div ref={mapRef} style={{ width: '100%', height: '400px' }} />
      <div className="location-legend">
        {Object.entries(locationStyles).map(([type, style]) => (
          <div key={type} className="legend-item">
            <span className="legend-icon" style={{ color: style.color }}>
              {style.icon}
            </span>
            <span className="legend-label">
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

LocationMap.defaultProps = {
  center: { lat: 37.7749, lng: -122.4194 },
  zoom: 4,
};

export default LocationMap;
