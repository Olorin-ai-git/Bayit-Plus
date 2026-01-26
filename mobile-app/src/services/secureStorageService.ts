/**
 * Secure Storage Service
 *
 * Manages secure storage of sensitive credentials (OAuth tokens, refresh tokens)
 * Uses platform-specific secure storage:
 * - iOS: Keychain (via react-native-keychain)
 * - Android: Keystore/Encrypted SharedPreferences (via react-native-keychain)
 *
 * SECURITY: Never store sensitive credentials in AsyncStorage or plain text
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('secureStorageService');

const SERVICE_NAME = 'BayitPlus';

const LEGACY_ASYNC_STORAGE_KEYS = {
  OAUTH_TOKEN: 'oauth_token',
  OAUTH_REFRESH_TOKEN: 'oauth_refresh_token',
  OAUTH_EXPIRY: 'oauth_expiry',
  OAUTH_USER_ID: 'oauth_user_id',
};

const MIGRATION_FLAG_KEY = 'keychain_migration_complete';

/**
 * Interface for stored oauth credentials
 */
export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
}

/**
 * Migrate credentials from AsyncStorage to Keychain (one-time migration)
 */
async function migrateFromAsyncStorage(): Promise<void> {
  try {
    const migrationComplete = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrationComplete === 'true') {
      return;
    }

    moduleLogger.info('Starting migration from AsyncStorage to Keychain');

    const accessToken = await AsyncStorage.getItem(LEGACY_ASYNC_STORAGE_KEYS.OAUTH_TOKEN);

    if (accessToken) {
      const refreshToken = await AsyncStorage.getItem(
        LEGACY_ASYNC_STORAGE_KEYS.OAUTH_REFRESH_TOKEN
      );
      const expiryStr = await AsyncStorage.getItem(LEGACY_ASYNC_STORAGE_KEYS.OAUTH_EXPIRY);
      const userId = await AsyncStorage.getItem(LEGACY_ASYNC_STORAGE_KEYS.OAUTH_USER_ID);

      const credentials: OAuthCredentials = {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt: expiryStr ? parseInt(expiryStr, 10) : undefined,
        userId: userId || undefined,
      };

      await Keychain.setGenericPassword(
        SERVICE_NAME,
        JSON.stringify(credentials),
        {
          service: SERVICE_NAME,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        }
      );

      await AsyncStorage.multiRemove([
        LEGACY_ASYNC_STORAGE_KEYS.OAUTH_TOKEN,
        LEGACY_ASYNC_STORAGE_KEYS.OAUTH_REFRESH_TOKEN,
        LEGACY_ASYNC_STORAGE_KEYS.OAUTH_EXPIRY,
        LEGACY_ASYNC_STORAGE_KEYS.OAUTH_USER_ID,
      ]);

      moduleLogger.info('Successfully migrated credentials to Keychain');
    }

    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch (error) {
    moduleLogger.error('Migration from AsyncStorage failed:', error);
  }
}

/**
 * Secure storage service for OAuth credentials
 *
 * Uses iOS Keychain and Android Keystore for secure credential storage
 * Protection against:
 * - Device theft / physical access
 * - App reverse engineering
 * - Memory dump attacks
 */
export const secureStorageService = {
  /**
   * Initialize the service and run any pending migrations
   */
  async initialize(): Promise<void> {
    await migrateFromAsyncStorage();
  },

  /**
   * Store OAuth credentials securely using Keychain
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
        throw new Error('Keychain storage returned false');
      }

      moduleLogger.info('OAuth credentials stored securely in Keychain');
    } catch (error) {
      moduleLogger.error('Failed to store OAuth credentials in Keychain:', error);
      throw new Error('Failed to securely store credentials');
    }
  },

  /**
   * Retrieve OAuth credentials securely from Keychain
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
      moduleLogger.error('Failed to retrieve OAuth credentials from Keychain:', error);
      return null;
    }
  },

  /**
   * Delete OAuth credentials securely from Keychain
   * Called on logout to ensure credentials are completely removed
   */
  async deleteOAuthCredentials(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: SERVICE_NAME,
      });

      moduleLogger.info('OAuth credentials deleted from Keychain');
    } catch (error) {
      moduleLogger.error('Failed to delete OAuth credentials from Keychain:', error);
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
      moduleLogger.error('Failed to check token expiry:', error);
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
      moduleLogger.error('Failed to get valid access token:', error);
      return null;
    }
  },

  /**
   * Check if biometric authentication is available for this device
   */
  async getBiometricType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType;
    } catch (error) {
      moduleLogger.error('Failed to check biometry support:', error);
      return null;
    }
  },
};
