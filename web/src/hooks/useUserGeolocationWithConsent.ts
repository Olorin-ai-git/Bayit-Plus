/**
 * useUserGeolocationWithConsent Hook
 *
 * Enhanced geolocation hook with GDPR-compliant consent management.
 * Only requests location after user grants explicit consent.
 *
 * Features:
 * - Consent-first approach
 * - Automatic location detection after consent
 * - Backend integration
 * - Caching with 24h TTL
 * - Timezone-based fallback
 *
 * Usage:
 * ```tsx
 * const {
 *   location,
 *   error,
 *   isDetecting,
 *   hasConsent,
 *   requestLocationPermission
 * } = useUserGeolocationWithConsent();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { logger as appLogger } from '../utils/logger';
import { GEOLOCATION_CONFIG } from '@/config/geolocationConfig';
import useLocationConsent from './useLocationConsent';

const logger = appLogger.scope('useUserGeolocationWithConsent');

type LocationSource = 'geolocation' | 'cache' | 'timezone_inferred';

interface LocationData {
  city: string;
  state: string;
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
  hasConsent: boolean;
  requestLocationPermission: () => void;
}

export const useUserGeolocationWithConsent = (): GeolocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const { hasConsent, requestConsent } = useLocationConsent();

  // Detect location when consent is granted
  useEffect(() => {
    if (!hasConsent) {
      // Clear location if consent is revoked
      setLocation(null);
      return;
    }

    const detectLocation = async () => {
      try {
        setIsDetecting(true);
        setError(null);

        // Check cache first
        const cached = getCachedLocation();
        if (cached) {
          logger.info('Location loaded from cache', cached);
          setLocation(cached);
          setIsDetecting(false);
          return;
        }

        // Check browser geolocation support
        if (!navigator.geolocation) {
          logger.warn('Geolocation API not available');
          fallbackToTimezoneLocation();
          setIsDetecting(false);
          return;
        }

        // Request geolocation from browser
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              logger.info('Browser geolocation coordinates obtained', {
                latitude,
                longitude,
              });

              const locationData = await reverseGeocode(latitude, longitude);

              if (locationData) {
                logger.info('Location detected successfully', locationData);
                setLocation(locationData);
                cacheLocation(locationData);
                saveLocationToUserPreferences(locationData).catch((err) => {
                  logger.warn('Failed to save location to preferences', {
                    error: err.message,
                  });
                });
              } else {
                logger.warn('Reverse geocoding returned no data');
                fallbackToTimezoneLocation();
              }
            } catch (err) {
              logger.error('Error processing geolocation', { error: err });
              setError('Failed to determine location');
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

            if (err.code === err.PERMISSION_DENIED) {
              setError('Location access denied. Please enable location in your browser settings.');
            } else if (err.code === err.TIMEOUT) {
              setError('Location request timed out');
            } else {
              setError('Failed to get location');
            }

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

        if (fallback) {
          const locationData: LocationData = {
            ...fallback,
            timestamp: new Date(),
            source: 'timezone_inferred',
          };
          logger.info('Using timezone-inferred location', locationData);
          setLocation(locationData);
          cacheLocation(locationData);
        } else {
          logger.warn('No timezone fallback available', { timezone });
        }
      } catch (err) {
        logger.warn('Failed to infer location from timezone', { error: err });
      }
    };

    detectLocation();
  }, [hasConsent]);

  const requestLocationPermission = useCallback(() => {
    requestConsent();
  }, [requestConsent]);

  return {
    location,
    error,
    isDetecting,
    hasConsent,
    requestLocationPermission,
  };
};

// Helper functions

async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationData | null> {
  try {
    const response = await fetch(
      '/api/v1/location/reverse-geocode?' +
        new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
        })
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

async function saveLocationToUserPreferences(location: LocationData): Promise<void> {
  try {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (!token) {
      logger.info('Not authenticated, skipping location save');
      return;
    }

    const response = await fetch('/api/v1/users/me/preferences', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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

function getCachedLocation(): LocationData | null {
  try {
    const cached = localStorage.getItem(GEOLOCATION_CONFIG.CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as LocationData & { cachedAt: string };
    const cacheAge = Date.now() - new Date(data.cachedAt).getTime();

    if (cacheAge > GEOLOCATION_CONFIG.CACHE_TTL_MS) {
      localStorage.removeItem(GEOLOCATION_CONFIG.CACHE_KEY);
      logger.info('Location cache expired', { cacheAge });
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
    localStorage.setItem(
      GEOLOCATION_CONFIG.CACHE_KEY,
      JSON.stringify({
        ...location,
        timestamp: location.timestamp.toISOString(),
        cachedAt: new Date().toISOString(),
      })
    );
    logger.info('Location cached successfully');
  } catch (err) {
    logger.warn('Failed to cache location', { error: err });
  }
}

export default useUserGeolocationWithConsent;
