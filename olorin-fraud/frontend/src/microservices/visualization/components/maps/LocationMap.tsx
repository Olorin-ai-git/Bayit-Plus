import React, { useRef, useEffect, useState } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { loadGoogleMapsAPI } from '../../utils/mapLoader';
import { useEventBus } from '../../hooks/useEventBus';
import { eventBus } from '@/shared/events/EventBus';
import { visualizationConfig } from '../../config/environment';
import { getRiskColor } from '../../utils/colorPalettes';
import type { LocationMarker, InvestigationLocationDetectedEvent } from '../../types/events.types';

interface LocationMapProps {
  investigationId: string;
  className?: string;
  enableClustering?: boolean;
  clusterThreshold?: number;
}

export function LocationMap({
  investigationId,
  className = '',
  enableClustering = true,
  clusterThreshold = 50
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<Map<string, google.maps.Marker>>(new Map());
  const [markerClusterer, setMarkerClusterer] = useState<MarkerClusterer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current) return;

    loadGoogleMapsAPI()
      .then((google) => {
        const newMap = new google.maps.Map(mapRef.current!, {
          center: { lat: 37.7749, lng: -122.4194 }, // Default: San Francisco
          zoom: 10,
          styles: getMapStyles(),
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true
        });

        // Listen for view changes
        newMap.addListener('idle', () => {
          handleMapViewChanged(newMap);
        });

        // Initialize marker clusterer if clustering is enabled
        if (enableClustering) {
          const clusterer = new MarkerClusterer({
            map: newMap,
            markers: [],
            algorithm: new MarkerClusterer.GridAlgorithm({ gridSize: 60 })
          });
          setMarkerClusterer(clusterer);
        }

        setMap(newMap);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load Google Maps'));
        setLoading(false);
      });
  }, [enableClustering]);

  // Subscribe to location-detected events
  useEventBus<InvestigationLocationDetectedEvent>('investigation:location-detected', (event) => {
    if (event.data.investigationId === investigationId && map) {
      addMarker(event.data.location);
    }
  });

  function addMarker(location: LocationMarker) {
    if (!map) return;

    // Check if marker already exists
    if (markers.has(location.id)) return;

    const marker = new google.maps.Marker({
      position: { lat: location.latitude, lng: location.longitude },
      map: enableClustering ? null : map, // Don't add to map if clustering
      title: location.label,
      icon: getMarkerIcon(location)
    });

    // Add click listener
    marker.addListener('click', () => {
      handleMarkerClick(location);
    });

    setMarkers(prev => new Map(prev).set(location.id, marker));

    // Add to clusterer if clustering is enabled
    if (markerClusterer && enableClustering) {
      markerClusterer.addMarker(marker);
      // Auto-enable clustering only if marker count exceeds threshold
      if (markers.size >= clusterThreshold) {
        markerClusterer.render();
      }
    }

    // Adjust map bounds to include new marker
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(m => {
      const pos = m.getPosition();
      if (pos) bounds.extend(pos);
    });
    bounds.extend(marker.getPosition()!);
    map.fitBounds(bounds);
  }

  function getMarkerIcon(location: LocationMarker): google.maps.Icon {
    const colors: Record<typeof location.type, string> = {
      customer: '#3B82F6',      // Blue
      business: '#10B981',      // Green
      device: '#F59E0B',        // Amber
      transaction: '#EF4444',   // Red
      risk: '#EF4444'           // Red
    };

    return {
      url: `data:image/svg+xml,${encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="${colors[location.type]}" stroke="white" stroke-width="2"/>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16)
    };
  }

  function handleMarkerClick(location: LocationMarker) {
    eventBus.publish('visualization:location-clicked', {
      investigationId,
      locationId: location.id,
      locationType: location.type,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude
      }
    });
  }

  function handleMapViewChanged(map: google.maps.Map) {
    const bounds = map.getBounds();
    const center = map.getCenter();
    const zoom = map.getZoom();

    if (!bounds || !center || zoom === undefined) return;

    eventBus.publish('visualization:map-view-changed', {
      investigationId,
      bounds: {
        north: bounds.getNorthEast().lat(),
        south: bounds.getSouthWest().lat(),
        east: bounds.getNorthEast().lng(),
        west: bounds.getSouthWest().lng()
      },
      center: {
        latitude: center.lat(),
        longitude: center.lng()
      },
      zoom
    });
  }

  function getMapStyles(): google.maps.MapTypeStyle[] {
    // Dark theme map styles for Olorin corporate look
    return [
      { elementType: 'geometry', stylers: [{ color: '#1A2332' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#0B1221' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#D1D5DB' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0891B2' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#242E3E' }] }
    ];
  }

  if (loading) {
    return (
      <div className={`location-map-loading ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-center">
            <div className="text-lg text-gray-400">Loading map...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`location-map-error ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-400">
            <div className="text-lg font-semibold mb-2">Failed to load map</div>
            <div className="text-sm">{error.message}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`location-map-container relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: '400px' }} />
    </div>
  );
}
