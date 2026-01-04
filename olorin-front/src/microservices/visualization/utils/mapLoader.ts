/**
 * Google Maps API Loader Utility
 *
 * Centralized loader for Google Maps API with configuration from environment.
 * Ensures single-load pattern and proper error handling.
 */

import { Loader } from '@googlemaps/js-api-loader';
import { visualizationConfig } from '../config/environment';

let loaderInstance: Loader | null = null;
let googleMapsPromise: Promise<typeof google> | null = null;

export interface MapLoaderOptions {
  libraries?: ('drawing' | 'geometry' | 'localContext' | 'places' | 'visualization' | 'marker')[];
  version?: string;
  language?: string;
  region?: string;
}

/**
 * Load Google Maps API
 * Uses singleton pattern to ensure only one load operation occurs
 */
export async function loadGoogleMapsAPI(options?: MapLoaderOptions): Promise<typeof google> {
  // Return existing promise if load is already in progress or completed
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  // Get API key from configuration
  const apiKey = visualizationConfig?.maps?.googleMapsApiKey;
  if (!apiKey) {
    throw new Error(
      'Google Maps API key is not configured. ' +
      'Please set REACT_APP_GOOGLE_MAPS_API_KEY in your environment.'
    );
  }

  // Create loader instance if not exists
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey,
      version: options?.version || 'weekly',
      libraries: options?.libraries || ['marker', 'geometry'],
      language: options?.language,
      region: options?.region
    });
  }

  // Store promise to prevent duplicate loads
  googleMapsPromise = loaderInstance.load();

  try {
    const google = await googleMapsPromise;
    return google;
  } catch (error) {
    // Reset promise on error to allow retry
    googleMapsPromise = null;
    throw error instanceof Error
      ? error
      : new Error('Failed to load Google Maps API');
  }
}

/**
 * Check if Google Maps API is loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return typeof google !== 'undefined' && google.maps !== undefined;
}

/**
 * Get Google Maps API (synchronous)
 * Throws error if API is not yet loaded
 */
export function getGoogleMaps(): typeof google {
  if (!isGoogleMapsLoaded()) {
    throw new Error('Google Maps API is not loaded. Call loadGoogleMapsAPI() first.');
  }
  return google;
}

/**
 * Create a map instance with default Olorin styling
 */
export async function createStyledMap(
  container: HTMLElement,
  options?: google.maps.MapOptions
): Promise<google.maps.Map> {
  const google = await loadGoogleMapsAPI();

  const defaultOptions: google.maps.MapOptions = {
    center: { lat: 37.7749, lng: -122.4194 }, // San Francisco
    zoom: 10,
    styles: getOlorinMapStyles(),
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: false, // We'll use custom controls
    ...options
  };

  return new google.maps.Map(container, defaultOptions);
}

/**
 * Get Olorin corporate map styling
 * Dark theme to match Olorin branding
 */
export function getOlorinMapStyles(): google.maps.MapTypeStyle[] {
  return [
    // Background
    { elementType: 'geometry', stylers: [{ color: '#1A2332' }] },

    // Labels
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0B1221' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#D1D5DB' }] },

    // Water
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#0891B2' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#06B6D4' }]
    },

    // Roads
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#374151' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#4B5563' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#4B5563' }]
    },

    // Points of Interest
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#242E3E' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#1F2937' }]
    },

    // Transit
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#242E3E' }]
    }
  ];
}

/**
 * Calculate bounds from array of coordinates
 */
export async function calculateBounds(
  coordinates: Array<{ lat: number; lng: number }>
): Promise<google.maps.LatLngBounds> {
  const google = await loadGoogleMapsAPI();
  const bounds = new google.maps.LatLngBounds();

  coordinates.forEach(coord => {
    bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
  });

  return bounds;
}
