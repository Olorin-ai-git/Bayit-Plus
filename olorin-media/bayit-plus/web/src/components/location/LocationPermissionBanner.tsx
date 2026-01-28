/**
 * LocationPermissionBanner Component
 *
 * Displays a banner prompting users to enable location services
 * for personalized content. Shows only when:
 * - User has not granted consent
 * - User has not explicitly dismissed
 * - Browser supports geolocation
 *
 * Features:
 * - Non-intrusive banner design
 * - Clear call-to-action
 * - Dismissible (remembers choice)
 * - Fully accessible
 * - Glass UI styling
 */

import React, { useState, useEffect } from 'react';
import useLocationConsent from '../../hooks/useLocationConsent';
import { logger } from '../../utils/logger';

const BANNER_DISMISSED_KEY = 'bayit_location_banner_dismissed';

export const LocationPermissionBanner: React.FC = () => {
  const { hasConsent, requestConsent, isLoading } = useLocationConsent();
  const [isDismissed, setIsDismissed] = useState(true); // Default hidden
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    const hasDismissed = dismissed === 'true';

    // Check if browser supports geolocation
    const supportsGeolocation = 'geolocation' in navigator;

    // Show banner if: no consent, not dismissed, and browser supports it
    const shouldShow = !hasConsent && !hasDismissed && supportsGeolocation && !isLoading;

    setIsDismissed(hasDismissed);
    setIsVisible(shouldShow);

    logger.info('Location banner visibility check', {
      hasConsent,
      hasDismissed,
      supportsGeolocation,
      shouldShow,
    });
  }, [hasConsent, isLoading]);

  const handleEnable = () => {
    requestConsent();
    // Banner will be hidden once consent is granted
  };

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setIsVisible(false);
    setIsDismissed(true);
    logger.info('Location banner dismissed');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4"
      role="banner"
      aria-label="Location services prompt"
    >
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <span
              className="text-4xl"
              role="img"
              aria-label="Location pin icon"
            >
              📍
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-2">
              Discover Israeli Content Near You
            </h3>
            <p className="text-sm text-white/80 mb-4 leading-relaxed">
              Enable location services to see Israeli community events, news, and stories from your area.
              Your privacy is protected - we only detect your city.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleEnable}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black/40"
                aria-label="Enable location services"
              >
                Enable Location
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black/40"
                aria-label="Dismiss location prompt"
              >
                Not Now
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/60 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 rounded"
            aria-label="Close banner"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionBanner;
