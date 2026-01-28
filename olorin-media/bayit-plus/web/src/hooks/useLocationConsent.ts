/**
 * useLocationConsent Hook
 *
 * Manages GDPR-compliant location tracking consent with backend integration.
 *
 * Features:
 * - Fetches current consent status from backend
 * - Shows consent modal when needed
 * - Stores consent locally and on server
 * - Integrates with useUserGeolocation
 *
 * Usage:
 * ```tsx
 * const {
 *   hasConsent,
 *   showConsentModal,
 *   grantConsent,
 *   revokeConsent,
 *   isLoading
 * } = useLocationConsent();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { logger as appLogger } from '../utils/logger';

const logger = appLogger.scope('useLocationConsent');

const CONSENT_STORAGE_KEY = 'bayit_location_consent';
const CONSENT_TIMESTAMP_KEY = 'bayit_location_consent_timestamp';

interface ConsentStatus {
  consent_given: boolean;
  timestamp: string | null;
  retention_days: number;
}

interface LocationConsentHook {
  /** Whether user has granted consent */
  hasConsent: boolean;

  /** Whether to show consent modal */
  showConsentModal: boolean;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;

  /** Grant consent (shows permission prompt, then saves) */
  grantConsent: () => Promise<void>;

  /** Revoke consent */
  revokeConsent: () => Promise<void>;

  /** Manually trigger consent modal */
  requestConsent: () => void;

  /** Close consent modal without action */
  closeConsentModal: () => void;
}

export const useLocationConsent = (): LocationConsentHook => {
  const [hasConsent, setHasConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check local and server consent status on mount
  useEffect(() => {
    const checkConsentStatus = async () => {
      try {
        setIsLoading(true);

        // Check local storage first (fast path)
        const localConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
        const localTimestamp = localStorage.getItem(CONSENT_TIMESTAMP_KEY);

        if (localConsent === 'true' && localTimestamp) {
          const timestamp = new Date(localTimestamp);
          const daysSinceConsent = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);

          // If local consent is recent (< 90 days), trust it
          if (daysSinceConsent < 90) {
            setHasConsent(true);
            setIsLoading(false);
            return;
          }
        }

        // Check with backend for authenticated users
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        if (token) {
          const response = await fetch('/api/v1/location-consent', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data: ConsentStatus = await response.json();
            setHasConsent(data.consent_given);

            // Sync local storage with server
            if (data.consent_given && data.timestamp) {
              localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
              localStorage.setItem(CONSENT_TIMESTAMP_KEY, data.timestamp);
            } else {
              localStorage.removeItem(CONSENT_STORAGE_KEY);
              localStorage.removeItem(CONSENT_TIMESTAMP_KEY);
            }
          } else if (response.status === 401) {
            // Not authenticated - use local consent only
            setHasConsent(localConsent === 'true');
          }
        } else {
          // Not authenticated - use local consent
          setHasConsent(localConsent === 'true');
        }
      } catch (err) {
        logger.error('Failed to check consent status', { error: err });
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fall back to local consent on error
        setHasConsent(localStorage.getItem(CONSENT_STORAGE_KEY) === 'true');
      } finally {
        setIsLoading(false);
      }
    };

    checkConsentStatus();
  }, []);

  const grantConsent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const timestamp = new Date().toISOString();

      // Save locally first (immediate UI update)
      localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
      localStorage.setItem(CONSENT_TIMESTAMP_KEY, timestamp);
      setHasConsent(true);

      // Save to backend for authenticated users
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (token) {
        const response = await fetch('/api/v1/location-consent', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            consent_given: true,
            retention_days: 90,
          }),
        });

        if (!response.ok) {
          logger.warn('Failed to save consent to backend', {
            status: response.status,
          });
        } else {
          logger.info('Consent saved to backend');
        }
      }

      setShowConsentModal(false);
      logger.info('Location consent granted');
    } catch (err) {
      logger.error('Failed to grant consent', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to save consent');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const revokeConsent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Remove locally
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      localStorage.removeItem(CONSENT_TIMESTAMP_KEY);
      // Also clear cached location
      localStorage.removeItem('bayit_user_location');
      setHasConsent(false);

      // Remove from backend for authenticated users
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (token) {
        const response = await fetch('/api/v1/location-consent', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            consent_given: false,
          }),
        });

        if (!response.ok) {
          logger.warn('Failed to revoke consent on backend', {
            status: response.status,
          });
        } else {
          logger.info('Consent revoked on backend');
        }
      }

      logger.info('Location consent revoked');
    } catch (err) {
      logger.error('Failed to revoke consent', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to revoke consent');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestConsent = useCallback(() => {
    setShowConsentModal(true);
  }, []);

  const closeConsentModal = useCallback(() => {
    setShowConsentModal(false);
  }, []);

  return {
    hasConsent,
    showConsentModal,
    isLoading,
    error,
    grantConsent,
    revokeConsent,
    requestConsent,
    closeConsentModal,
  };
};

export default useLocationConsent;
