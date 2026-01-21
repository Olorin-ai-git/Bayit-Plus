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

import AsyncStorage from '@react-native-async-storage/async-storage';

// For production, install react-native-keychain:
// npm install react-native-keychain
// Then uncomment the import below and use it instead of AsyncStorage

// import * as Keychain from 'react-native-keychain';

const SECURE_KEYS = {
  OAUTH_TOKEN: 'oauth_token',
  OAUTH_REFRESH_TOKEN: 'oauth_refresh_token',
  OAUTH_EXPIRY: 'oauth_expiry',
  OAUTH_USER_ID: 'oauth_user_id',
};

const SERVICE_NAME = 'BayitPlus';

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
 * Secure storage service for OAuth credentials
 *
 * IMPORTANT: This is currently using AsyncStorage as a fallback.
 * For production deployment:
 * 1. Install react-native-keychain: npm install react-native-keychain
 * 2. Run pod install in ios directory
 * 3. Update imports and uncomment Keychain code below
 * 4. Update pod specs if necessary
 */
export const secureStorageService = {
  /**
   * Store OAuth credentials securely
   *
   * IMPORTANT: In production, this MUST use Keychain on iOS and Keystore on Android
   * to protect against:
   * - Device theft / physical access
   * - App reverse engineering
   * - Memory dump attacks
   */
  async storeOAuthCredentials(credentials: OAuthCredentials): Promise<void> {
    try {
      // Production: Use react-native-keychain instead
      // const success = await Keychain.setGenericPassword(
      //   SERVICE_NAME,
      //   JSON.stringify(credentials),
      //   {
      //     accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      //     securityLevel: Keychain.SECURITY_LEVEL.HIGH,
      //   }
      // );

      // Fallback: Store in AsyncStorage (development only)
      await AsyncStorage.setItem(
        SECURE_KEYS.OAUTH_TOKEN,
        credentials.accessToken
      );

      if (credentials.refreshToken) {
        await AsyncStorage.setItem(
          SECURE_KEYS.OAUTH_REFRESH_TOKEN,
          credentials.refreshToken
        );
      }

      if (credentials.expiresAt) {
        await AsyncStorage.setItem(
          SECURE_KEYS.OAUTH_EXPIRY,
          credentials.expiresAt.toString()
        );
      }

      if (credentials.userId) {
        await AsyncStorage.setItem(
          SECURE_KEYS.OAUTH_USER_ID,
          credentials.userId
        );
      }
    } catch (error) {
      console.error('Failed to store OAuth credentials:', error);
      throw new Error('Failed to securely store credentials');
    }
  },

  /**
   * Retrieve OAuth credentials securely
   */
  async getOAuthCredentials(): Promise<OAuthCredentials | null> {
    try {
      // Production: Use react-native-keychain instead
      // const credentials = await Keychain.getGenericPassword({
      //   service: SERVICE_NAME,
      // });
      // if (!credentials) return null;
      // return JSON.parse(credentials.password);

      // Fallback: Retrieve from AsyncStorage (development only)
      const accessToken = await AsyncStorage.getItem(SECURE_KEYS.OAUTH_TOKEN);
      if (!accessToken) {
        return null;
      }

      const refreshToken = await AsyncStorage.getItem(
        SECURE_KEYS.OAUTH_REFRESH_TOKEN
      );
      const expiryStr = await AsyncStorage.getItem(SECURE_KEYS.OAUTH_EXPIRY);
      const userId = await AsyncStorage.getItem(SECURE_KEYS.OAUTH_USER_ID);

      return {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt: expiryStr ? parseInt(expiryStr, 10) : undefined,
        userId: userId || undefined,
      };
    } catch (error) {
      console.error('Failed to retrieve OAuth credentials:', error);
      return null;
    }
  },

  /**
   * Delete OAuth credentials securely
   * Called on logout to ensure credentials are completely removed
   */
  async deleteOAuthCredentials(): Promise<void> {
    try {
      // Production: Use react-native-keychain instead
      // await Keychain.resetGenericPassword({ service: SERVICE_NAME });

      // Fallback: Remove from AsyncStorage (development only)
      await AsyncStorage.multiRemove([
        SECURE_KEYS.OAUTH_TOKEN,
        SECURE_KEYS.OAUTH_REFRESH_TOKEN,
        SECURE_KEYS.OAUTH_EXPIRY,
        SECURE_KEYS.OAUTH_USER_ID,
      ]);
    } catch (error) {
      console.error('Failed to delete OAuth credentials:', error);
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

      // Token is expired if expiry time is in the past
      return Date.now() > credentials.expiresAt;
    } catch (error) {
      console.error('Failed to check token expiry:', error);
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

      // Check if token is still valid
      if (credentials.expiresAt && Date.now() < credentials.expiresAt) {
        return credentials.accessToken;
      }

      // Token expired, would need to refresh here
      // This should be handled by the auth service
      return null;
    } catch (error) {
      console.error('Failed to get valid access token:', error);
      return null;
    }
  },
};

/**
 * MIGRATION GUIDE: AsyncStorage to Keychain
 *
 * Current state (development): Using AsyncStorage for OAuth tokens
 * Target state (production): Using native secure storage (Keychain/Keystore)
 *
 * Migration steps:
 * 1. Install react-native-keychain:
 *    npm install react-native-keychain
 *
 * 2. Link native modules (if not using autolinking):
 *    react-native link react-native-keychain
 *
 * 3. For iOS, run:
 *    cd ios && pod install && cd ..
 *
 * 4. Update this service to uncomment Keychain code and comment AsyncStorage code
 *
 * 5. Create migration script to transfer existing tokens:
 *    - Read from AsyncStorage
 *    - Store in Keychain
 *    - Delete from AsyncStorage
 *
 * 6. Update auth store to use this service instead of AsyncStorage
 *
 * 7. Test on physical device (Keychain not available in simulator)
 *
 * Security benefits:
 * - iOS: Stored in Keychain with encryption at rest
 * - Android: Stored in Encrypted SharedPreferences / Keystore
 * - Tokens inaccessible to other apps
 * - Protected from device theft / physical access
 * - No exposure to memory dumps or app reverse engineering
 */
