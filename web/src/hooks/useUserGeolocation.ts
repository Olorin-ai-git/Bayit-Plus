import { useState, useEffect } from 'react';
import { logger as appLogger } from '../utils/logger';

const logger = appLogger.scope('useUserGeolocation');

interface LocationData {
  city: string;
  state: string;
  county?: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  source: 'geolocation' | 'cache' | 'timezone_inferred';
}

interface GeolocationResult {
  location: LocationData | null;
  error: string | null;
  isDetecting: boolean;
}

const CACHE_KEY = 'bayit_user_location';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fallback cities based on timezone inference
const TIMEZONE_FALLBACK_CITIES: Record<string, LocationData> = {
  'America/New_York': {
    city: 'New York',
    state: 'NY',
    county: 'New York County',
    latitude: 40.7128,
    longitude: -74.006,
    timestamp: new Date(),
    source: 'timezone_inferred',
  },
  'America/Los_Angeles': {
    city: 'Los Angeles',
    state: 'CA',
    county: 'Los Angeles County',
    latitude: 34.0522,
    longitude: -118.2437,
    timestamp: new Date(),
    source: 'timezone_inferred',
  },
  'America/Chicago': {
    city: 'Chicago',
    state: 'IL',
    county: 'Cook County',
    latitude: 41.8781,
    longitude: -87.6298,
    timestamp: new Date(),
    source: 'timezone_inferred',
  },
  'America/Denver': {
    city: 'Denver',
    state: 'CO',
    county: 'Denver County',
    latitude: 39.7392,
    longitude: -104.9903,
    timestamp: new Date(),
    source: 'timezone_inferred',
  },
  'America/Phoenix': {
    city: 'Phoenix',
    state: 'AZ',
    county: 'Maricopa County',
    latitude: 33.4484,
    longitude: -112.074,
    timestamp: new Date(),
    source: 'timezone_inferred',
  },
};

/**
 * Hook for detecting user's geographic location via browser geolocation API.
 *
 * Flow:
 * 1. Check localStorage cache (24h TTL)
 * 2. Request browser geolocation permission
 * 3. Convert coordinates to city/state via reverse geocoding
 * 4. Cache result in localStorage
 * 5. Store in user.preferences.detected_location via API
 *
 * If geolocation denied or unavailable, falls back to timezone-inferred location.
 */
export const useUserGeolocation = (): GeolocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    const detectLocation = async () => {
      try {
        setIsDetecting(true);

        // 1. Check cache first
        const cached = getCachedLocation();
        if (cached) {
          logger.info('Location loaded from cache', cached);
          setLocation(cached);
          setIsDetecting(false);
          return;
        }

        // 2. Request browser geolocation
        if (!navigator.geolocation) {
          throw new Error('Geolocation API not available');
        }

        // Request coordinates
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;

              // 3. Reverse geocode coordinates to city/state
              const locationData = await reverseGeocode(
                latitude,
                longitude
              );

              if (locationData) {
                logger.info('Location detected', locationData);
                setLocation(locationData);

                // 4. Cache the result
                cacheLocation(locationData);

                // 5. Store in user preferences (async, non-blocking)
                saveLocationToUserPreferences(locationData).catch((err) => {
                  logger.warn('Failed to save location to user preferences', {
                    error: err.message,
                  });
                });
              }
            } catch (err) {
              logger.error('Error processing geolocation', { error: err });
              fallbackToTimezoneLocation();
            } finally {
              setIsDetecting(false);
            }
          },
          (err) => {
            // Geolocation denied or failed
            logger.warn('Geolocation request denied or failed', {
              code: err.code,
              message: err.message,
            });

            // Fall back to timezone-inferred location
            fallbackToTimezoneLocation();
            setIsDetecting(false);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 3600000, // Reuse cached coords for 1 hour
          }
        );
      } catch (err) {
        logger.error('Geolocation detection failed', { error: err });
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsDetecting(false);
      }
    };

    const fallbackToTimezoneLocation = () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const fallback = TIMEZONE_FALLBACK_CITIES[timezone];

        if (fallback) {
          logger.info('Using timezone-inferred location', fallback);
          setLocation(fallback);
          cacheLocation(fallback);
        }
      } catch (err) {
        logger.warn('Failed to infer location from timezone', { error: err });
      }
    };

    // Start detection
    detectLocation();
  }, []);

  return {
    location,
    error,
    isDetecting,
  };
};

/**
 * Reverse geocode coordinates to city/state via backend API.
 * The backend handles actual reverse geocoding via GeoNames API.
 */
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationData | null> {
  try {
    // Call backend reverse geocoding endpoint
    const response = await fetch(
      '/api/v1/location/reverse-geocode?' +
        new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) })
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.city && data.state) {
      return {
        city: data.city,
        state: data.state,
        county: data.county,
        latitude,
        longitude,
        timestamp: new Date(),
        source: 'geolocation',
      };
    }

    return null;
  } catch (err) {
    logger.error('Reverse geocoding failed', { error: err });
    return null;
  }
}

/**
 * Save detected location to user preferences in backend.
 */
async function saveLocationToUserPreferences(
  location: LocationData
): Promise<void> {
  try {
    const response = await fetch('/api/v1/users/me/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detected_location: {
          city: location.city,
          state: location.state,
          county: location.county,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp.toISOString(),
          source: location.source,
        },
        location_permission: 'granted',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    logger.info('Location saved to user preferences');
  } catch (err) {
    logger.error('Failed to save location to preferences', { error: err });
    throw err;
  }
}

/**
 * Get cached location if available and fresh.
 */
function getCachedLocation(): LocationData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);

    if (!cached) return null;

    const data = JSON.parse(cached) as LocationData & { cachedAt: string };
    const cachedAt = new Date(data.cachedAt).getTime();
    const now = Date.now();

    if (now - cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return {
      city: data.city,
      state: data.state,
      county: data.county,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date(data.timestamp),
      source: data.source,
    };
  } catch (err) {
    logger.warn('Error reading location cache', { error: err });
    return null;
  }
}

/**
 * Cache location in localStorage.
 */
function cacheLocation(location: LocationData): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...location,
        timestamp: location.timestamp.toISOString(),
        cachedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    logger.warn('Failed to cache location', { error: err });
  }
}

export default useUserGeolocation;
