/**
 * SecureStorageModule.ts - TypeScript Tests
 * Tests token management methods integration
 */

import { secureStorageModule } from '../../src/native/SecureStorageModule';

describe('SecureStorageModule - Token Management', () => {
  beforeEach(async () => {
    // Clear all tokens before each test
    await secureStorageModule.clear();
  });

  describe('storeTokenWithExpiry', () => {
    it('should store token with expiration timestamp', async () => {
      const tokenId = 'test_token_1';
      const token = 'token_value_123';
      const expiresAt = Date.now() + 3600000;

      const result = await secureStorageModule.storeTokenWithExpiry(
        tokenId,
        token,
        expiresAt,
      );

      expect(result.status).toBe('stored');
    });

    it('should throw error if tokenId is missing', async () => {
      const token = 'token_value_123';
      const expiresAt = Date.now() + 3600000;

      await expect(
        secureStorageModule.storeTokenWithExpiry('', token, expiresAt),
      ).rejects.toThrow();
    });

    it('should throw error if token value is missing', async () => {
      const tokenId = 'test_token_1';
      const expiresAt = Date.now() + 3600000;

      await expect(
        secureStorageModule.storeTokenWithExpiry(tokenId, '', expiresAt),
      ).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token with new value and expiration', async () => {
      const tokenId = 'refresh_token_1';
      const oldToken = 'old_token_value';
      const newToken = 'new_token_value';
      const newExpiresAt = Date.now() + 7200000;

      await secureStorageModule.storeTokenWithExpiry(
        tokenId,
        oldToken,
        Date.now() + 3600000,
      );

      const result = await secureStorageModule.refreshToken(
        tokenId,
        newToken,
        newExpiresAt,
      );

      expect(result.success).toBe(true);
      expect(result.newToken).toBe(newToken);
      expect(result.expiresAt).toBe(newExpiresAt);
    });

    it('should return success: false on refresh error', async () => {
      const result = await secureStorageModule.refreshToken(
        '',
        'token',
        Date.now() + 3600000,
      );

      expect(result.success).toBe(false);
    });
  });

  describe('getTokenMetadata', () => {
    it('should return metadata for valid token', async () => {
      const tokenId = 'metadata_token_1';
      const token = 'token_value';
      const expiresAt = Date.now() + 3600000;

      await secureStorageModule.storeTokenWithExpiry(tokenId, token, expiresAt);
      const metadata = await secureStorageModule.getTokenMetadata(tokenId);

      expect(metadata).not.toBeNull();
      expect(metadata?.tokenId).toBe(tokenId);
      expect(metadata?.exists).toBe(true);
      expect(metadata?.isExpired).toBe(false);
      expect(metadata?.expiresAt).toBe(expiresAt);
    });

    it('should indicate token is expired', async () => {
      const tokenId = 'expired_token_1';
      const token = 'token_value';
      const expiresAt = Date.now() - 1000; // Already expired

      await secureStorageModule.storeTokenWithExpiry(tokenId, token, expiresAt);
      const metadata = await secureStorageModule.getTokenMetadata(tokenId);

      expect(metadata?.isExpired).toBe(true);
    });

    it('should indicate token needs refresh', async () => {
      const tokenId = 'refresh_needed_token';
      const token = 'token_value';
      const expiresAt = Date.now() + 4 * 60 * 1000; // 4 minutes

      await secureStorageModule.storeTokenWithExpiry(tokenId, token, expiresAt);
      const metadata = await secureStorageModule.getTokenMetadata(tokenId);

      expect(metadata?.shouldRefresh).toBe(true);
    });

    it('should return null metadata for non-existent token', async () => {
      const metadata = await secureStorageModule.getTokenMetadata(
        'non_existent_token',
      );

      expect(metadata?.exists).toBe(false);
    });

    it('should throw error if tokenId is missing', async () => {
      await expect(secureStorageModule.getTokenMetadata('')).rejects.toThrow();
    });
  });

  describe('checkIfTokenNeedsRefresh', () => {
    it('should return true if token expires within 5 minutes', async () => {
      const tokenId = 'refresh_check_token';
      const token = 'token_value';
      const expiresAt = Date.now() + 4 * 60 * 1000; // 4 minutes

      await secureStorageModule.storeTokenWithExpiry(tokenId, token, expiresAt);
      const needsRefresh = await secureStorageModule.checkIfTokenNeedsRefresh(
        tokenId,
      );

      expect(needsRefresh).toBe(true);
    });

    it('should return false if token expires after 5 minutes', async () => {
      const tokenId = 'no_refresh_token';
      const token = 'token_value';
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      await secureStorageModule.storeTokenWithExpiry(tokenId, token, expiresAt);
      const needsRefresh = await secureStorageModule.checkIfTokenNeedsRefresh(
        tokenId,
      );

      expect(needsRefresh).toBe(false);
    });

    it('should return false for non-existent token', async () => {
      const needsRefresh = await secureStorageModule.checkIfTokenNeedsRefresh(
        'non_existent_token',
      );

      expect(needsRefresh).toBe(false);
    });

    it('should throw error if tokenId is missing', async () => {
      await expect(
        secureStorageModule.checkIfTokenNeedsRefresh(''),
      ).rejects.toThrow();
    });
  });

  describe('flagTokenAsBreach', () => {
    it('should flag token as breached', async () => {
      const tokenId = 'breach_token_1';
      const reason = 'Suspicious activity detected';

      const result = await secureStorageModule.flagTokenAsBreach(
        tokenId,
        reason,
      );

      expect(result.status).toBe('stored');
    });

    it('should throw error if tokenId is missing', async () => {
      await expect(
        secureStorageModule.flagTokenAsBreach('', 'Breach reason'),
      ).rejects.toThrow();
    });
  });

  describe('isTokenBreach', () => {
    it('should return true for breached token', async () => {
      const tokenId = 'breach_check_token';

      await secureStorageModule.flagTokenAsBreach(
        tokenId,
        'Compromised token',
      );
      const isBreach = await secureStorageModule.isTokenBreach(tokenId);

      expect(isBreach).toBe(true);
    });

    it('should return false for non-breached token', async () => {
      const tokenId = 'normal_token_1';
      const token = 'token_value';

      await secureStorageModule.storeTokenWithExpiry(
        tokenId,
        token,
        Date.now() + 3600000,
      );
      const isBreach = await secureStorageModule.isTokenBreach(tokenId);

      expect(isBreach).toBe(false);
    });

    it('should return false for non-existent token', async () => {
      const isBreach = await secureStorageModule.isTokenBreach(
        'non_existent_token',
      );

      expect(isBreach).toBe(false);
    });

    it('should throw error if tokenId is missing', async () => {
      await expect(secureStorageModule.isTokenBreach('')).rejects.toThrow();
    });
  });

  describe('removeStoredToken', () => {
    it('should remove stored token', async () => {
      const tokenId = 'token_to_remove';
      const token = 'token_value';

      await secureStorageModule.storeTokenWithExpiry(
        tokenId,
        token,
        Date.now() + 3600000,
      );
      const result = await secureStorageModule.removeStoredToken(tokenId);

      expect(result.status).toBe('removed');
    });

    it('should throw error if tokenId is missing', async () => {
      await expect(secureStorageModule.removeStoredToken('')).rejects.toThrow();
    });
  });

  describe('Integration - Full Token Lifecycle', () => {
    it('should handle complete token lifecycle', async () => {
      const tokenId = 'lifecycle_token';
      const initialToken = 'initial_token_value';
      const refreshedToken = 'refreshed_token_value';
      const initialExpiry = Date.now() + 3600000;
      const refreshedExpiry = Date.now() + 7200000;

      // Store initial token
      await secureStorageModule.storeTokenWithExpiry(
        tokenId,
        initialToken,
        initialExpiry,
      );

      // Check metadata
      let metadata = await secureStorageModule.getTokenMetadata(tokenId);
      expect(metadata?.exists).toBe(true);
      expect(metadata?.isExpired).toBe(false);

      // Refresh token
      const refreshResult = await secureStorageModule.refreshToken(
        tokenId,
        refreshedToken,
        refreshedExpiry,
      );
      expect(refreshResult.success).toBe(true);

      // Verify metadata updated
      metadata = await secureStorageModule.getTokenMetadata(tokenId);
      expect(metadata?.expiresAt).toBe(refreshedExpiry);

      // Check needs refresh (should be false for newly refreshed token)
      const needsRefresh = await secureStorageModule.checkIfTokenNeedsRefresh(
        tokenId,
      );
      expect(needsRefresh).toBe(false);

      // Flag as breach
      await secureStorageModule.flagTokenAsBreach(tokenId, 'Leaked in breach');
      let isBreach = await secureStorageModule.isTokenBreach(tokenId);
      expect(isBreach).toBe(true);

      // Remove token
      const removeResult = await secureStorageModule.removeStoredToken(tokenId);
      expect(removeResult.status).toBe('removed');
    });
  });
});
