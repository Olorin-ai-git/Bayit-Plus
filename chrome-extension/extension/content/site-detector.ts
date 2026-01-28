/**
 * Site Detector
 *
 * Detects supported streaming sites and identifies their specific characteristics
 */

import { createLogger } from '@/lib/logger';
import { SUPPORTED_SITES } from '@/config/constants';

const logger = createLogger('SiteDetector');

export interface SiteInfo {
  hostname: string;
  name: string;
  videoSelector: string;
  isSupported: boolean;
}

/**
 * Detect current site
 */
export function detectSite(): SiteInfo | null {
  const hostname = window.location.hostname;

  logger.debug('Detecting site', { hostname });

  // Check if current site is supported
  const supportedSite = SUPPORTED_SITES.find((site) =>
    hostname.includes(site.hostname)
  );

  if (supportedSite) {
    logger.info('Supported site detected', {
      hostname: supportedSite.hostname,
      name: supportedSite.name,
    });

    return {
      hostname: supportedSite.hostname,
      name: supportedSite.name,
      videoSelector: supportedSite.videoSelector,
      isSupported: true,
    };
  }

  logger.debug('Site not supported', { hostname });
  return null;
}

/**
 * Check if current site is supported
 */
export function isSupportedSite(): boolean {
  return detectSite() !== null;
}

/**
 * Get site-specific configuration
 */
export function getSiteConfig(): SiteInfo | null {
  return detectSite();
}
