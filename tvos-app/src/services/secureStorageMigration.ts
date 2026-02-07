/**
 * Secure Storage Migration - tvOS
 *
 * One-time migration of credentials from AsyncStorage to Keychain.
 * Called during secureStorageService.initialize().
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import type { OAuthCredentials } from '../types/secureStorage.types';

const SERVICE_NAME = 'BayitPlusTVOS';

const LEGACY_ASYNC_STORAGE_KEYS = {
  OAUTH_TOKEN: 'oauth_token',
  OAUTH_REFRESH_TOKEN: 'oauth_refresh_token',
  OAUTH_EXPIRY: 'oauth_expiry',
  OAUTH_USER_ID: 'oauth_user_id',
};

const MIGRATION_FLAG_KEY = 'keychain_migration_complete';

/**
 * Migrate credentials from AsyncStorage to Keychain (one-time migration)
 */
export async function migrateFromAsyncStorage(): Promise<void> {
  try {
    const migrationComplete = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrationComplete === 'true') {
      return;
    }

    logger.info('Starting migration from AsyncStorage to Keychain', { module: 'SecureStorage' });

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

      logger.info('Successfully migrated credentials to Keychain', { module: 'SecureStorage' });
    }

    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch (error) {
    logger.error('Migration from AsyncStorage failed', { module: 'SecureStorage', error: error instanceof Error ? error.message : String(error) });
  }
}
