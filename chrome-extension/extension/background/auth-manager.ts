/**
 * Authentication Manager
 *
 * Handles JWT token storage with AES-256-GCM encryption
 * Manages user authentication state across extension contexts
 */

import { createLogger } from '@/lib/logger';
import { encryptToken, decryptToken, getEncryptionKey, isTokenExpired } from '@/lib/crypto';

const logger = createLogger('AuthManager');

export interface User {
  id: string;
  email: string;
  name?: string;
  subscription_tier: 'free' | 'premium' | 'family';
  subscription_status?: string;
}

/**
 * Store JWT token (encrypted)
 */
export async function storeToken(token: string): Promise<void> {
  try {
    const key = await getEncryptionKey();
    const encrypted = await encryptToken(token, key);

    await chrome.storage.local.set({ jwt_enc: encrypted });

    logger.info('Token stored successfully');
  } catch (error) {
    logger.error('Failed to store token', { error: String(error) });
    throw error;
  }
}

/**
 * Get JWT token (decrypted)
 */
export async function getToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get('jwt_enc');
    if (!result.jwt_enc) {
      return null;
    }

    const key = await getEncryptionKey();
    const token = await decryptToken(result.jwt_enc, key);

    // Check if token is expired
    if (isTokenExpired(token)) {
      logger.warn('Token expired, clearing storage');
      await clearToken();
      return null;
    }

    return token;
  } catch (error) {
    logger.error('Failed to get token', { error: String(error) });
    return null;
  }
}

/**
 * Clear JWT token
 */
export async function clearToken(): Promise<void> {
  try {
    await chrome.storage.local.remove('jwt_enc');
    logger.info('Token cleared successfully');
  } catch (error) {
    logger.error('Failed to clear token', { error: String(error) });
    throw error;
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = await getToken();
    if (!token) {
      return null;
    }

    // User info is stored locally for quick access
    const result = await chrome.storage.local.get('user_info');
    if (result.user_info) {
      return result.user_info as User;
    }

    // Fetch from backend if not cached
    return await fetchUserInfo(token);
  } catch (error) {
    logger.error('Failed to get current user', { error: String(error) });
    return null;
  }
}

/**
 * Fetch user info from backend and cache it
 */
async function fetchUserInfo(token: string): Promise<User | null> {
  try {
    const { CONFIG } = await import('@/config/constants');

    const response = await fetch(`${CONFIG.API.BASE_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(CONFIG.API.TIMEOUT_MS),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token invalid, clear it
        await clearToken();
        return null;
      }
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const user: User = await response.json();

    // Cache user info
    await chrome.storage.local.set({ user_info: user });

    logger.info('User info fetched and cached', { userId: user.id });

    return user;
  } catch (error) {
    logger.error('Failed to fetch user info', { error: String(error) });
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

/**
 * Check if user is premium subscriber
 */
export async function isPremiumUser(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.subscription_tier === 'premium' || user?.subscription_tier === 'family';
}

/**
 * Refresh user info from backend
 */
export async function refreshUserInfo(): Promise<void> {
  try {
    const token = await getToken();
    if (!token) {
      logger.warn('Cannot refresh user info: not authenticated');
      return;
    }

    await fetchUserInfo(token);
  } catch (error) {
    logger.error('Failed to refresh user info', { error: String(error) });
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChanged(callback: (authenticated: boolean) => void): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.jwt_enc) {
      const authenticated = !!changes.jwt_enc.newValue;
      callback(authenticated);
    }
  });
}

// Export functions for use by crypto.ts (to avoid circular dependency)
export { encryptToken, decryptToken, getEncryptionKey };
