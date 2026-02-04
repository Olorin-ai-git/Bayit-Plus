/**
 * Mobile Detection Utilities
 *
 * Detects mobile devices and handles redirection to mobile subdomain (m.bayit.tv)
 */

/**
 * Checks if the current device is mobile based on user agent
 * More reliable than viewport width for initial detection
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Check for mobile user agents
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;

  return mobileRegex.test(userAgent);
}

/**
 * Checks if the current device is a tablet
 * Tablets are treated as desktop for this application
 */
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // iPad detection
  const isIPad = /iPad/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Android tablet detection (width > 768px and Android)
  const isAndroidTablet = /Android/.test(userAgent) && !/Mobile/.test(userAgent);

  return isIPad || isAndroidTablet;
}

/**
 * Checks if user should be redirected to mobile site
 * Returns true only for phones, false for tablets and desktops
 */
export function shouldRedirectToMobile(): boolean {
  return isMobileDevice() && !isTabletDevice();
}

/**
 * Checks if the current hostname is the mobile subdomain
 */
export function isMobileSubdomain(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;

  // Check for m.bayit.tv or m.localhost (for development)
  return hostname.startsWith('m.') || hostname === 'm.bayit.tv';
}

/**
 * Checks if the current hostname is the main domain (not mobile subdomain)
 */
export function isMainDomain(): boolean {
  if (typeof window === 'undefined') return true;

  return !isMobileSubdomain();
}

/**
 * Gets the mobile subdomain URL preserving the current path and query
 */
export function getMobileURL(): string {
  if (typeof window === 'undefined') return '';

  const { protocol, hostname, pathname, search, hash } = window.location;

  // Convert hostname to mobile subdomain
  let mobileHostname: string;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Development: Use m.localhost
    mobileHostname = 'm.localhost';
  } else if (hostname.includes('bayit.tv')) {
    // Production: Convert bayit.tv → m.bayit.tv
    mobileHostname = hostname.replace(/^(www\.)?/, 'm.');
  } else {
    // Other domains: Prepend m.
    mobileHostname = `m.${hostname}`;
  }

  // Preserve the port for development
  const port = window.location.port ? `:${window.location.port}` : '';

  return `${protocol}//${mobileHostname}${port}${pathname}${search}${hash}`;
}

/**
 * Gets the desktop domain URL from mobile subdomain
 */
export function getDesktopURL(): string {
  if (typeof window === 'undefined') return '';

  const { protocol, hostname, pathname, search, hash } = window.location;

  // Remove m. prefix
  const desktopHostname = hostname.replace(/^m\./, '');

  // Preserve the port for development
  const port = window.location.port ? `:${window.location.port}` : '';

  return `${protocol}//${desktopHostname}${port}${pathname}${search}${hash}`;
}

/**
 * Checks if user has opted to stay on desktop site
 * Uses sessionStorage to remember preference for the session
 */
export function hasDesktopPreference(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return sessionStorage.getItem('forceDesktopSite') === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets user preference to stay on desktop site
 */
export function setDesktopPreference(force: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    if (force) {
      sessionStorage.setItem('forceDesktopSite', 'true');
    } else {
      sessionStorage.removeItem('forceDesktopSite');
    }
  } catch {
    // Ignore sessionStorage errors
  }
}

/**
 * Main redirect function - performs the redirect if conditions are met
 * Returns true if redirect was performed, false otherwise
 */
export function performMobileRedirect(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;

  // Don't redirect if:
  // 1. Already on mobile subdomain
  // 2. Not a mobile device
  // 3. User has desktop preference
  // 4. On localhost (no m.localhost DNS, use ?forceDesktop=true or DevTools for testing)
  if (isMobileSubdomain() || !shouldRedirectToMobile() || hasDesktopPreference()) {
    return false;
  }

  // Skip redirect on localhost - m.localhost doesn't exist
  // This allows testing mobile view in DevTools without redirect
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return false;
  }

  // Perform redirect
  const mobileURL = getMobileURL();
  window.location.replace(mobileURL);
  return true;
}
