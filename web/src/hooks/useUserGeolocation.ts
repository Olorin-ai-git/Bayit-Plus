import { useState, useEffect } from 'react';
import { logger as appLogger } from '../utils/logger';
import { GEOLOCATION_CONFIG } from '@/config/geolocationConfig';
import api from '@/services/api';

const logger = appLogger.scope('useUserGeolocation');

type LocationSource = 'geolocation' | 'cache' | 'timezone_inferred';

interface LocationData {
  city: string;
  state: string;
  country?: string;
  county?: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  source: LocationSource;
}

interface GeolocationResult {
  location: LocationData | null;
  error: string | null;
  isDetecting: boolean;
}

export const useUserGeolocation = (): GeolocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    const detectLocation = async () => {
      try {
        setIsDetecting(true);
        const cached = getCachedLocation();
        if (cached) {
          logger.info('Location loaded from cache', cached);
          setLocation(cached);
          setIsDetecting(false);
          return;
        }
        if (!navigator.geolocation) {
          throw new Error('Geolocation API not available');
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const locationData = await reverseGeocode(latitude, longitude);

              if (locationData) {
                logger.info('Location detected', locationData);
                setLocation(locationData);
                cacheLocation(locationData);
                saveLocationToUserPreferences(locationData).catch((err) => {
                  logger.warn('Failed to save location to preferences', {
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
            logger.warn('Geolocation request denied or failed', {
              code: err.code,
              message: err.message,
            });
            fallbackToTimezoneLocation();
            setIsDetecting(false);
          },
          {
            enableHighAccuracy: GEOLOCATION_CONFIG.ENABLE_HIGH_ACCURACY,
            timeout: GEOLOCATION_CONFIG.GEOLOCATION_TIMEOUT_MS,
            maximumAge: GEOLOCATION_CONFIG.GEOLOCATION_MAX_AGE_MS,
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
        const fallback = GEOLOCATION_CONFIG.TIMEZONE_FALLBACK_CITIES[timezone];

        // Use timezone-specific fallback if available, otherwise default to NYC
        const locationToUse = fallback || GEOLOCATION_CONFIG.DEFAULT_LOCATION;
        const locationData: LocationData = {
          ...locationToUse,
          timestamp: new Date(),
          source: 'timezone_inferred',
        };

        if (fallback) {
          logger.info('Using timezone-inferred location', { timezone, ...locationData });
        } else {
          logger.info('Timezone not in fallback list, using default NYC location', {
            detectedTimezone: timezone,
            ...locationData,
          });
        }

        setLocation(locationData);
        cacheLocation(locationData);
      } catch (err) {
        logger.warn('Failed to infer location from timezone, using default NYC', { error: err });
        // Ultimate fallback - always use NYC for US-based Israeli expats
        const defaultLocation: LocationData = {
          ...GEOLOCATION_CONFIG.DEFAULT_LOCATION,
          timestamp: new Date(),
          source: 'timezone_inferred',
        };
        setLocation(defaultLocation);
        cacheLocation(defaultLocation);
      }
    };

    detectLocation();
  }, []);

  return { location, error, isDetecting };
};

async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationData | null> {
  try {
    const response = await api.get('/location/reverse-geocode', {
      params: {
        latitude,
        longitude,
      },
    });

    if (response.city && response.state) {
      return {
        city: response.city,
        state: response.state,
        county: response.county,
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

async function saveLocationToUserPreferences(location: LocationData): Promise<void> {
  try {
    await api.patch('/users/me/preferences', {
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
    });
    logger.info('Location saved to user preferences');
  } catch (err) {
    logger.error('Failed to save location to preferences', { error: err });
    throw err;
  }
}

function getCachedLocation(): LocationData | null {
  try {
    const cached = localStorage.getItem(GEOLOCATION_CONFIG.CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached) as LocationData & { cachedAt: string };
    if (Date.now() - new Date(data.cachedAt).getTime() > GEOLOCATION_CONFIG.CACHE_TTL_MS) {
      localStorage.removeItem(GEOLOCATION_CONFIG.CACHE_KEY);
      return null;
    }
    return {
      ...data,
      timestamp: new Date(data.timestamp),
    };
  } catch (err) {
    logger.warn('Error reading location cache', { error: err });
    return null;
  }
}

function cacheLocation(location: LocationData): void {
  try {
    localStorage.setItem(GEOLOCATION_CONFIG.CACHE_KEY, JSON.stringify({
      ...location,
      timestamp: location.timestamp.toISOString(),
      cachedAt: new Date().toISOString(),
    }));
  } catch (err) {
    logger.warn('Failed to cache location', { error: err });
  }
}

export default useUserGeolocation;