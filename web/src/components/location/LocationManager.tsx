/**
 * LocationManager Component
 *
 * Lightweight location detection - browser handles permission prompts.
 * Automatically detects user location when browser permission is granted.
 *
 * Usage: Add once to your App root component
 * ```tsx
 * <LocationManager />
 * ```
 *
 * Features:
 * - Automatic browser geolocation detection
 * - Backend integration for location-based content
 * - Silent operation - no UI needed
 */

import React, { useEffect } from 'react';
import useUserGeolocationWithConsent from '../../hooks/useUserGeolocationWithConsent';
import { logger } from '../../utils/logger';

export const LocationManager: React.FC = () => {
  const { location, error, isDetecting } = useUserGeolocationWithConsent();

  // Log location updates
  useEffect(() => {
    if (location) {
      logger.info('User location detected', {
        city: location.city,
        state: location.state,
        country: location.country,
        source: location.source,
      });
    }
  }, [location]);

  // Log errors
  useEffect(() => {
    if (error) {
      logger.warn('Location detection failed', { error });
    }
  }, [error]);

  // Silent component - browser handles permission UI
  return null;
};

export default LocationManager;
