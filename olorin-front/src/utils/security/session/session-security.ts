/**
 * Session Security
 * Session tracking and timeout management
 * Feature: Client-side security controls
 */

import { getCachedSecurityConfig } from '../config/security-config';

/**
 * Storage keys for session tracking
 */
const SESSION_KEY = 'olorin_session';
const ACTIVITY_KEY = 'last_activity';

/**
 * Debounce interval from environment variable (milliseconds)
 */
function getDebounceInterval(): number {
  return parseInt(
    process.env.REACT_APP_SECURITY_ACTIVITY_DEBOUNCE_MS || '1000',
    10
  );
}

/**
 * Session check interval from environment variable (milliseconds)
 */
function getSessionCheckInterval(): number {
  return parseInt(
    process.env.REACT_APP_SECURITY_SESSION_CHECK_INTERVAL_MS || '60000',
    10
  );
}

/**
 * Initialize session tracking
 */
export function initializeSession(): void {
  updateActivity();
  setupActivityTracking();
}

/**
 * Update last activity timestamp
 */
export function updateActivity(): void {
  const now = Date.now();
  sessionStorage.setItem(ACTIVITY_KEY, now.toString());
}

/**
 * Check if session has timed out
 */
export function isSessionExpired(): boolean {
  const config = getCachedSecurityConfig();
  const lastActivity = sessionStorage.getItem(ACTIVITY_KEY);

  if (!lastActivity) {
    return true;
  }

  const timeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
  const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);

  return timeSinceActivity > timeoutMs;
}

/**
 * Get time remaining until session expires (in seconds)
 */
export function getSessionTimeRemaining(): number {
  const config = getCachedSecurityConfig();
  const lastActivity = sessionStorage.getItem(ACTIVITY_KEY);

  if (!lastActivity) {
    return 0;
  }

  const timeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
  const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
  const remaining = timeoutMs - timeSinceActivity;

  return Math.max(0, Math.floor(remaining / 1000)); // Return seconds remaining
}

/**
 * Clear session data
 */
export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(ACTIVITY_KEY);
  sessionStorage.removeItem('csrf_token');
  localStorage.removeItem('auth_token');
}

/**
 * Setup automatic activity tracking
 */
export function setupActivityTracking(): void {
  // Track user interactions
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

  let activityTimer: ReturnType<typeof setTimeout> | null = null;

  const updateActivityDebounced = () => {
    if (activityTimer) {
      clearTimeout(activityTimer);
    }

    activityTimer = setTimeout(() => {
      updateActivity();
    }, getDebounceInterval());
  };

  events.forEach(event => {
    document.addEventListener(event, updateActivityDebounced, { passive: true });
  });

  // Check for session timeout periodically
  setInterval(() => {
    if (isSessionExpired()) {
      console.warn('Session expired due to inactivity');
      clearSession();
      // Dispatch custom event for app to handle
      window.dispatchEvent(new CustomEvent('sessionExpired'));
    }
  }, getSessionCheckInterval());
}

/**
 * Get session status
 */
export function getSessionStatus(): {
  active: boolean;
  timeRemaining: number;
} {
  return {
    active: !isSessionExpired(),
    timeRemaining: getSessionTimeRemaining(),
  };
}

/**
 * Extend session timeout
 */
export function extendSession(): void {
  updateActivity();
}

/**
 * Check if session is about to expire (within warning threshold)
 */
export function isSessionExpiringSoon(): boolean {
  const warningThresholdSeconds = parseInt(
    process.env.REACT_APP_SECURITY_SESSION_WARNING_THRESHOLD_SECONDS || '300',
    10
  );

  const timeRemaining = getSessionTimeRemaining();
  return timeRemaining > 0 && timeRemaining <= warningThresholdSeconds;
}
