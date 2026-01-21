/**
 * Sentry Error Tracking Configuration for Bayit+ Web App.
 *
 * Initializes Sentry SDK with browser tracing, session replay,
 * and integrates with the shared logger.
 */

import * as Sentry from '@sentry/react';
import { initLoggerSentry } from '@bayit/shared-utils/logger';
import { initErrorBoundarySentry } from '@bayit/shared/components/ErrorBoundary';

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
  'credit_card',
  'card_number',
  'cvv',
  'ssn',
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
 * Initialize Sentry for the web application.
 * Call this once at app startup before React renders.
 *
 * @returns true if Sentry was initialized, false if disabled
 */
export const initSentry = (): boolean => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.info('[Sentry] DSN not configured - error tracking disabled');
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
      release: import.meta.env.VITE_SENTRY_RELEASE || undefined,

      // Performance monitoring
      tracesSampleRate: 0.2,

      // Session replay for debugging (masked by default)
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          // Mask all text by default for privacy
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

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
      debug: import.meta.env.DEV,
    });

    // Initialize shared logger with Sentry
    initLoggerSentry({
      captureException: (error, options) => {
        Sentry.captureException(error, { extra: options?.extra });
      },
      captureMessage: (message, options) => {
        Sentry.captureMessage(message, {
          level: options?.level as Sentry.SeverityLevel,
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

    console.info(
      `[Sentry] Initialized - environment: ${import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development'}`
    );
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
  if (!import.meta.env.VITE_SENTRY_DSN) return;

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
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.setUser(null);
};

/**
 * Re-export Sentry's ErrorBoundary for convenience.
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

export default Sentry;
