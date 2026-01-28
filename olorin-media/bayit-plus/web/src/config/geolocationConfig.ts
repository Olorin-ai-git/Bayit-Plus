/**
 * Geolocation configuration and fallback cities.
 * Timezone-inferred fallback locations for users who deny geolocation permission.
 */

interface TimezoneLocation {
  city: string;
  state: string;
  county?: string;
  latitude: number;
  longitude: number;
}

export const GEOLOCATION_CONFIG = {
  // Cache configuration
  CACHE_KEY: 'bayit_user_location',
  CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours

  // Geolocation API configuration
  GEOLOCATION_TIMEOUT_MS: 10000, // 10 second timeout
  GEOLOCATION_MAX_AGE_MS: 3600000, // Reuse cached coords for 1 hour
  ENABLE_HIGH_ACCURACY: false, // Standard accuracy is sufficient

  // Timezone-based fallback cities for denied geolocation
  TIMEZONE_FALLBACK_CITIES: {
    'America/New_York': {
      city: 'New York',
      state: 'NY',
      county: 'New York County',
      latitude: 40.7128,
      longitude: -74.006,
    },
    'America/Los_Angeles': {
      city: 'Los Angeles',
      state: 'CA',
      county: 'Los Angeles County',
      latitude: 34.0522,
      longitude: -118.2437,
    },
    'America/Chicago': {
      city: 'Chicago',
      state: 'IL',
      county: 'Cook County',
      latitude: 41.8781,
      longitude: -87.6298,
    },
    'America/Denver': {
      city: 'Denver',
      state: 'CO',
      county: 'Denver County',
      latitude: 39.7392,
      longitude: -104.9903,
    },
    'America/Phoenix': {
      city: 'Phoenix',
      state: 'AZ',
      county: 'Maricopa County',
      latitude: 33.4484,
      longitude: -112.074,
    },
    'America/Toronto': {
      city: 'Toronto',
      state: 'ON',
      county: 'York County',
      latitude: 43.6532,
      longitude: -79.3832,
    },
    'America/Mexico_City': {
      city: 'Mexico City',
      state: 'CDMX',
      latitude: 19.4326,
      longitude: -99.1332,
    },
    'Europe/London': {
      city: 'London',
      state: 'GB',
      latitude: 51.5074,
      longitude: -0.1278,
    },
    'Europe/Paris': {
      city: 'Paris',
      state: 'FR',
      latitude: 48.8566,
      longitude: 2.3522,
    },
  } as Record<string, TimezoneLocation>,
};

export type GeolocationConfig = typeof GEOLOCATION_CONFIG;
