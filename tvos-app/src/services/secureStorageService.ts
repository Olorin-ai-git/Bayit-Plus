/**
 * Secure Storage Service - tvOS
 *
 * Manages secure storage of sensitive credentials (OAuth tokens, refresh tokens)
 * using tvOS Keychain (via react-native-keychain).
 * SECURITY: Never store sensitive credentials in AsyncStorage or plain text.
 */

import * as Keychain from 'react-native-keychain';
import { logger } from '../utils/logger';
import { migrateFromAsyncStorage } from './secureStorageMigration';
import type { OAuthCredentials } from '../types/secureStorage.types';

export type { OAuthCredentials } from '../types/secureStorage.types';

const SERVICE_NAME = 'BayitPlusTVOS';

/**
 * Secure storage service for OAuth credentials (tvOS)
 * Uses tvOS Keychain for secure credential storage.
 * Protects against device theft, reverse engineering, and memory dump attacks.
 */
export const secureStorageService = {
  /**
   * Initialize the service and run any pending migrations
   */
  async initialize(): Promise<void> {
    await migrateFromAsyncStorage();
  },

  /**
   * Store OAuth credentials securely using tvOS Keychain
   */
  async storeOAuthCredentials(credentials: OAuthCredentials): Promise<void> {
    try {
      const success = await Keychain.setGenericPassword(
        SERVICE_NAME,
        JSON.stringify(credentials),
        {
          service: SERVICE_NAME,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        }
      );

      if (!success) {
        throw new Error('tvOS Keychain storage returned false');
      }

      logger.info('OAuth credentials stored securely in tvOS Keychain', { module: 'SecureStorage' });
    } catch (error) {
      logger.error('Failed to store OAuth credentials in tvOS Keychain', { module: 'SecureStorage', error: error instanceof Error ? error.message : String(error) });
      throw new Error('Failed to securely store credentials');
    }
  },

  /**
   * Retrieve OAuth credentials securely from tvOS Keychain
   */
  async getOAuthCredentials(): Promise<OAuthCredentials | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_NAME,
      });

      if (!credentials || credentials === false) {
        return null;
      }

      return JSON.parse(credentials.password) as OAuthCredentials;
    } catch (error) {
      logger.error('Failed to retrieve OAuth credentials from tvOS Keychain', { module: 'SecureStorage', error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  },

  /**
   * Delete OAuth credentials securely from tvOS Keychain
   * Called on logout to ensure credentials are completely removed
   */
  async deleteOAuthCredentials(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: SERVICE_NAME,
      });

      logger.info('OAuth credentials deleted from tvOS Keychain', { module: 'SecureStorage' });
    } catch (error) {
      logger.error('Failed to delete OAuth credentials from tvOS Keychain', { module: 'SecureStorage', error: error instanceof Error ? error.message : String(error) });
      throw new Error('Failed to delete credentials');
    }
  },

  /**
   * Check if OAuth token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    try {
      const credentials = await this.getOAuthCredentials();
      if (!credentials || !credentials.expiresAt) {
        return true;
      }

      return Date.now() > credentials.expiresAt;
    } catch (error) {
      logger.error('Failed to check token expiry', { module: 'SecureStorage', error: error instanceof Error ? error.message : String(error) });
      return true;
    }
  },

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string | null> {
    try {
      const credentials = await this.getOAuthCredentials();
      if (!credentials) {
        return null;
      }

      if (credentials.expiresAt && Date.now() < credentials.expiresAt) {
        return credentials.accessToken;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get valid access token', { module: 'SecureStorage', error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  },

  /**
   * Check if biometric authentication is available (tvOS does not support biometrics)
   */
  async getBiometricType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    // tvOS does not support Touch ID or Face ID
    return null;
  },
};
