/**
 * useLocationTV - Simple timezone-based location detection for tvOS
 *
 * tvOS does not have geolocation API, so we use timezone inference
 * as a fallback method to approximate user location.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = '@bayit_location_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface LocationData {
  city: string;
  state: string;
  timestamp: Date;
  source: 'timezone_inferred' | 'cache';
}

interface LocationResult {
  location: LocationData | null;
  isDetecting: boolean;
}

/**
 * Map timezone to approximate city/state
 * This is a fallback for tvOS which lacks geolocation
 */
const getLocationFromTimezone = (): LocationData | null => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Map common US timezones to major cities
  const timezoneMap: Record<string, { city: string; state: string }> = {
    'America/New_York': { city: 'New York', state: 'NY' },
    'America/Chicago': { city: 'Chicago', state: 'IL' },
    'America/Denver': { city: 'Denver', state: 'CO' },
    'America/Los_Angeles': { city: 'Los Angeles', state: 'CA' },
    'America/Phoenix': { city: 'Phoenix', state: 'AZ' },
    'America/Detroit': { city: 'Detroit', state: 'MI' },
    'America/Indianapolis': { city: 'Indianapolis', state: 'IN' },
    'America/Kentucky/Louisville': { city: 'Louisville', state: 'KY' },
    'America/North_Dakota/Center': { city: 'Bismarck', state: 'ND' },
    'America/Anchorage': { city: 'Anchorage', state: 'AK' },
    'America/Juneau': { city: 'Juneau', state: 'AK' },
    'Pacific/Honolulu': { city: 'Honolulu', state: 'HI' },
  };

  const location = timezoneMap[timezone];
  if (!location) {
    return null;
  }

  return {
    ...location,
    timestamp: new Date(),
    source: 'timezone_inferred',
  };
};

const getCachedLocation = async (): Promise<LocationData | null> => {
  try {
    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const age = Date.now() - new Date(parsed.timestamp).getTime();

    if (age > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }

    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp),
      source: 'cache' as const,
    };
  } catch {
    return null;
  }
};

const cacheLocation = async (location: LocationData): Promise<void> => {
  try {
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
  } catch {
    // Ignore cache errors
  }
};

export const useLocationTV = (): LocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detectLocation = async () => {
      try {
        // Check cache first
        const cached = await getCachedLocation();
        if (cached) {
          setLocation(cached);
          setIsDetecting(false);
          return;
        }

        // Use timezone-based detection
        const detected = getLocationFromTimezone();
        if (detected) {
          setLocation(detected);
          await cacheLocation(detected);
        }
      } catch {
        // Silently fail - location is optional
      } finally {
        setIsDetecting(false);
      }
    };

    detectLocation();
  }, []);

  return { location, isDetecting };
};
