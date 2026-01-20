/**
 * Sentry Error Tracking Configuration for Bayit+ Mobile App (iOS).
 *
 * Initializes Sentry SDK for React Native with error tracking,
 * native crash reporting, and integrates with the shared logger.
 */

import * as Sentry from '@sentry/react-native';
import { initLoggerSentry } from '@bayit/shared/utils/logger';
import { initErrorBoundarySentry } from '@bayit/shared/components/ErrorBoundary';

// Environment variable access (from react-native-dotenv or similar)
const SENTRY_DSN = process.env.SENTRY_DSN || '';
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || 'development';
const SENTRY_RELEASE = process.env.SENTRY_RELEASE || '';

/**
 * Sensitive fields to scrub from events.
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'secret',
  'token',
  'api_key',
  'apikey',
  'authorization',
  'auth',
  'credentials',
  'private_key',
  'access_token',
  'refresh_token',
  'jwt',
  'session',
  'cookie',
]);

/**
 * Scrub sensitive data from object recursively.
 */
const scrubObject = (obj: Record<string, unknown>): void => {
  for (const key of Object.keys(obj)) {
    const keyLower = key.toLowerCase();
    if (Array.from(SENSITIVE_FIELDS).some((s) => keyLower.includes(s))) {
      obj[key] = '[Filtered]';
    } else if (obj[key] && typeof obj[key] === 'object') {
      scrubObject(obj[key] as Record<string, unknown>);
    }
  }
};

/**
 * Initialize Sentry for the mobile application.
 * Call this once at app startup before React renders.
 *
 * @returns true if Sentry was initialized, false if disabled
 */
export const initSentry = (): boolean => {
  if (!SENTRY_DSN) {
    console.info('[Sentry] DSN not configured - error tracking disabled');
    return false;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT,
      release: SENTRY_RELEASE || undefined,

      // Performance monitoring
      tracesSampleRate: 0.2,

      // React Native specific options
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,

      // Native crash handling
      enableNative: true,
      enableNativeCrashHandling: true,

      // ANR detection for iOS
      enableAppHangTracking: true,
      appHangTimeoutInterval: 5,

      // Scrub sensitive data before sending
      beforeSend(event) {
        if (event.request?.headers) {
          scrubObject(event.request.headers as Record<string, unknown>);
        }
        if (event.extra) {
          scrubObject(event.extra as Record<string, unknown>);
        }
        if (event.contexts) {
          scrubObject(event.contexts as Record<string, unknown>);
        }
        return event;
      },

      // Don't send PII by default
      sendDefaultPii: false,

      // Enable debug in development
      debug: __DEV__,
    });

    // Initialize shared logger with Sentry
    initLoggerSentry({
      captureException: (error, options) => {
        Sentry.captureException(error, { extra: options?.extra });
      },
      captureMessage: (message, options) => {
        Sentry.captureMessage(message, {
          level: options?.level as 'fatal' | 'error' | 'warning' | 'info' | 'debug',
          extra: options?.extra,
        });
      },
      setTag: (key, value) => {
        Sentry.setTag(key, value);
      },
    });

    // Initialize ErrorBoundary with Sentry
    initErrorBoundarySentry({
      captureException: (error, options) => {
        Sentry.captureException(error, { extra: options?.extra });
      },
    });

    console.info(`[Sentry] Initialized - environment: ${SENTRY_ENVIRONMENT}`);
    return true;
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
    return false;
  }
};

/**
 * Set the current user for Sentry events.
 */
export const setSentryUser = (
  userId: string,
  email?: string,
  username?: string
): void => {
  if (!SENTRY_DSN) return;

  Sentry.setUser({
    id: userId,
    email,
    username,
  });
};

/**
 * Clear the current user from Sentry.
 */
export const clearSentryUser = (): void => {
  if (!SENTRY_DSN) return;

  Sentry.setUser(null);
};

/**
 * Wrap a component with Sentry's error boundary.
 */
export const withSentryErrorBoundary = Sentry.wrap;

/**
 * Create a native crash for testing (only works in production builds).
 */
export const testNativeCrash = (): void => {
  Sentry.nativeCrash();
};

export default Sentry;
