import { useEffect } from 'react';
import { performMobileRedirect } from '@/utils/mobileDetection';
import logger from '@/utils/logger';

/**
 * MobileRedirect Component
 *
 * Automatically redirects mobile devices from bayit.tv to m.bayit.tv
 * Runs once on app mount before any other rendering
 *
 * Features:
 * - Detects mobile devices (phones only, not tablets)
 * - Preserves current path and query parameters
 * - Respects user preference to stay on desktop site
 * - Prevents redirect loops
 */
export default function MobileRedirect() {
  useEffect(() => {
    try {
      const didRedirect = performMobileRedirect();

      if (didRedirect) {
        logger.info('Redirecting mobile device to mobile subdomain', 'MobileRedirect', {
          userAgent: navigator.userAgent,
          hostname: window.location.hostname,
        });
      } else {
        logger.debug('No mobile redirect needed', 'MobileRedirect', {
          hostname: window.location.hostname,
          userAgent: navigator.userAgent,
        });
      }
    } catch (error) {
      logger.error('Mobile redirect check failed', 'MobileRedirect', error);
    }
  }, []); // Run once on mount

  // This component doesn't render anything
  return null;
}
