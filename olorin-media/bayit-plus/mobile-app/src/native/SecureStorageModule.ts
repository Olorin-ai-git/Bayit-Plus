/**
 * SecureStorageModule.ts - TypeScript Bridge for Encrypted Secure Storage
 * Provides secure storage for OAuth tokens and sensitive credentials
 * Uses: Android Keystore, iOS Keychain
 * Encryption: AES256-GCM (Android), AES-256 (iOS)
 */

import { NativeModules } from 'react-native';

const SecureStorageModuleNative = NativeModules.SecureStorageModule;

export interface StorageResult {
  status: string;
  value?: string | null;
  exists?: boolean;
}

export interface TokenMetadata {
  tokenId: string;
  exists: boolean;
  isExpired: boolean;
  shouldRefresh: boolean;
  isBreach: boolean;
  rotationCount: number;
  expiresAt: number;
}

export interface TokenRefreshResult {
  success: boolean;
  newToken?: string;
  expiresAt?: number;
}

export interface TokenBreachInfo {
  flaggedAt: number;
  reason: string;
}

export class SecureStorageModule {
  /**
   * Store encrypted value securely
   * @param key Storage key
   * @param value Value to store (e.g., OAuth token, session key)
   * @returns Promise when stored
   */
  async setItem(key: string, value: string): Promise<StorageResult> {
    if (!key || !value) {
      throw new Error('Key and value are required');
    }
    return SecureStorageModuleNative.setItem(key, value);
  }

  /**
   * Retrieve encrypted value
   * @param key Storage key
   * @returns Promise with value or null if not found
   */
  async getItem(key: string): Promise<{ value: string | null; exists: boolean }> {
    if (!key) {
      throw new Error('Key is required');
    }
    return SecureStorageModuleNative.getItem(key);
  }

  /**
   * Remove stored value
   * @param key Storage key to remove
   * @returns Promise when removed
   */
  async removeItem(key: string): Promise<StorageResult> {
    if (!key) {
      throw new Error('Key is required');
    }
    return SecureStorageModuleNative.removeItem(key);
  }

  /**
   * Clear all stored values
   * WARNING: This removes ALL stored data
   * @returns Promise when cleared
   */
  async clear(): Promise<StorageResult> {
    return SecureStorageModuleNative.clear();
  }

  /**
   * Store OAuth token
   * @param token OAuth access token
   * @param expiresIn Expiration time in seconds
   * @returns Promise when stored
   */
  async storeOAuthToken(token: string, expiresIn: number): Promise<StorageResult> {
    const tokenData = JSON.stringify({
      token,
      expiresAt: Date.now() + expiresIn * 1000,
      storedAt: Date.now(),
    });
    return this.setItem('oauth_token', tokenData);
  }

  /**
   * Retrieve OAuth token
   * @returns Promise with token data or null
   */
  async getOAuthToken(): Promise<{ token: string; expiresAt: number } | null> {
    const result = await this.getItem('oauth_token');
    if (!result.exists || !result.value) {
      return null;
    }

    try {
      const data = JSON.parse(result.value);
      // Check if token expired
      if (data.expiresAt < Date.now()) {
        // Remove expired token
        await this.removeItem('oauth_token');
        return null;
      }
      return { token: data.token, expiresAt: data.expiresAt };
    } catch (e) {
      return null;
    }
  }

  /**
   * Store session token
   * @param sessionToken Session token from backend
   * @returns Promise when stored
   */
  async storeSessionToken(sessionToken: string): Promise<StorageResult> {
    const sessionData = JSON.stringify({
      token: sessionToken,
      storedAt: Date.now(),
    });
    return this.setItem('session_token', sessionData);
  }

  /**
   * Retrieve session token
   * @returns Promise with session token or null
   */
  async getSessionToken(): Promise<string | null> {
    const result = await this.getItem('session_token');
    if (!result.exists || !result.value) {
      return null;
    }

    try {
      const data = JSON.parse(result.value);
      return data.token;
    } catch (e) {
      return null;
    }
  }

  /**
   * Store token with explicit expiration timestamp (for SecureStorageTokenManager integration)
   * @param tokenId Unique identifier for token
   * @param token Token value
   * @param expiresAt Expiration timestamp in milliseconds
   * @returns Promise when stored
   */
  async storeTokenWithExpiry(
    tokenId: string,
    token: string,
    expiresAt: number,
  ): Promise<StorageResult> {
    if (!tokenId || !token) {
      throw new Error('Token ID and token value are required');
    }
    const tokenKey = `token_${tokenId}`;
    const tokenData = JSON.stringify({
      token,
      expiresAt,
      storedAt: Date.now(),
    });
    return this.setItem(tokenKey, tokenData);
  }

  /**
   * Refresh stored token with new value and expiration
   * @param tokenId Token identifier
   * @param newToken New token value
   * @param newExpiresAt New expiration timestamp
   * @returns Promise with refresh result
   */
  async refreshToken(
    tokenId: string,
    newToken: string,
    newExpiresAt: number,
  ): Promise<TokenRefreshResult> {
    if (!tokenId || !newToken) {
      throw new Error('Token ID and new token value are required');
    }
    try {
      const tokenKey = `token_${tokenId}`;
      await this.storeTokenWithExpiry(tokenId, newToken, newExpiresAt);
      return {
        success: true,
        newToken,
        expiresAt: newExpiresAt,
      };
    } catch (e) {
      return {
        success: false,
      };
    }
  }

  /**
   * Get comprehensive token metadata
   * @param tokenId Token identifier
   * @returns Promise with token metadata
   */
  async getTokenMetadata(tokenId: string): Promise<TokenMetadata | null> {
    if (!tokenId) {
      throw new Error('Token ID is required');
    }
    try {
      const tokenKey = `token_${tokenId}`;
      const result = await this.getItem(tokenKey);

      if (!result.exists || !result.value) {
        return {
          tokenId,
          exists: false,
          isExpired: true,
          shouldRefresh: false,
          isBreach: false,
          rotationCount: 0,
          expiresAt: 0,
        };
      }

      const data = JSON.parse(result.value);
      const now = Date.now();
      const isExpired = now >= data.expiresAt;
      const timeToExpiry = data.expiresAt - now;
      const shouldRefresh = !isExpired && timeToExpiry <= 5 * 60 * 1000; // 5 minutes

      return {
        tokenId,
        exists: true,
        isExpired,
        shouldRefresh,
        isBreach: false,
        rotationCount: 0,
        expiresAt: data.expiresAt,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if token needs refresh (expires within 5 minutes)
   * @param tokenId Token identifier
   * @returns Promise with boolean indicating if refresh is needed
   */
  async checkIfTokenNeedsRefresh(tokenId: string): Promise<boolean> {
    if (!tokenId) {
      throw new Error('Token ID is required');
    }
    try {
      const metadata = await this.getTokenMetadata(tokenId);
      return metadata?.shouldRefresh ?? false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Flag token as breached (compromised)
   * @param tokenId Token identifier
   * @param reason Reason for breach flag
   * @returns Promise when flagged
   */
  async flagTokenAsBreach(tokenId: string, reason: string): Promise<StorageResult> {
    if (!tokenId) {
      throw new Error('Token ID is required');
    }
    const breachKey = `breach_${tokenId}`;
    const breachData = JSON.stringify({
      flaggedAt: Date.now(),
      reason,
    } as TokenBreachInfo);
    return this.setItem(breachKey, breachData);
  }

  /**
   * Check if token is flagged as breached
   * @param tokenId Token identifier
   * @returns Promise with boolean indicating breach status
   */
  async isTokenBreach(tokenId: string): Promise<boolean> {
    if (!tokenId) {
      throw new Error('Token ID is required');
    }
    try {
      const breachKey = `breach_${tokenId}`;
      const result = await this.getItem(breachKey);
      return result.exists && result.value !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Remove stored token
   * @param tokenId Token identifier
   * @returns Promise when removed
   */
  async removeStoredToken(tokenId: string): Promise<StorageResult> {
    if (!tokenId) {
      throw new Error('Token ID is required');
    }
    const tokenKey = `token_${tokenId}`;
    return this.removeItem(tokenKey);
  }
}

export const secureStorageModule = new SecureStorageModule();
export default secureStorageModule;
