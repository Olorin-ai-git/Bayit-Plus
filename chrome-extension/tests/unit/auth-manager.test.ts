/**
 * Unit Tests: Authentication Manager
 *
 * Tests JWT token storage, encryption, and authentication state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  storeToken,
  getToken,
  clearToken,
  getCurrentUser,
  isAuthenticated,
  isPremiumUser,
  refreshUserInfo,
  onAuthStateChanged,
  type User,
} from '@/background/auth-manager';
import * as crypto from '@/lib/crypto';

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock config
vi.mock('@/config/constants', () => ({
  CONFIG: {
    API: {
      BASE_URL: 'https://api.test.com',
      TIMEOUT_MS: 30000,
    },
  },
}));

describe('AuthManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storeToken', () => {
    it('should encrypt and store JWT token', async () => {
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.signature';

      // Mock encryption functions
      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'encryptToken').mockResolvedValue('encrypted_token_base64');

      await storeToken(testToken);

      expect(crypto.getEncryptionKey).toHaveBeenCalled();
      expect(crypto.encryptToken).toHaveBeenCalledWith(testToken, expect.any(Object));
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        jwt_enc: 'encrypted_token_base64',
      });
    });

    it('should throw error if encryption fails', async () => {
      const testToken = 'test_token';

      vi.spyOn(crypto, 'getEncryptionKey').mockRejectedValue(new Error('Encryption key generation failed'));

      await expect(storeToken(testToken)).rejects.toThrow();
    });
  });

  describe('getToken', () => {
    it('should decrypt and return stored JWT token', async () => {
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.signature';

      // Mock chrome.storage.local.get to return encrypted token
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ jwt_enc: 'encrypted_token_base64' });

      // Mock decryption functions
      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue(testToken);
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(false);

      const token = await getToken();

      expect(token).toBe(testToken);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('jwt_enc');
      expect(crypto.decryptToken).toHaveBeenCalledWith('encrypted_token_base64', expect.any(Object));
    });

    it('should return null if no token stored', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const token = await getToken();

      expect(token).toBeNull();
    });

    it('should return null and clear storage if token is expired', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.signature';

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ jwt_enc: 'encrypted_token_base64' });
      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue(expiredToken);
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(true);

      const token = await getToken();

      expect(token).toBeNull();
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('jwt_enc');
    });

    it('should return null if decryption fails', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ jwt_enc: 'invalid_encrypted_token' });
      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockRejectedValue(new Error('Decryption failed'));

      const token = await getToken();

      expect(token).toBeNull();
    });
  });

  describe('clearToken', () => {
    it('should remove encrypted token from storage', async () => {
      await clearToken();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith('jwt_enc');
    });

    it('should throw error if removal fails', async () => {
      vi.mocked(chrome.storage.local.remove).mockRejectedValue(new Error('Storage error'));

      await expect(clearToken()).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    const mockUser: User = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      subscription_tier: 'free',
    };

    it('should return cached user info if available', async () => {
      const mockToken = 'valid_token';

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({ jwt_enc: 'encrypted' }) // First call in getToken()
        .mockResolvedValueOnce({ user_info: mockUser }); // Second call for user_info

      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue(mockToken);
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(false);

      const user = await getCurrentUser();

      expect(user).toEqual(mockUser);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('user_info');
    });

    it('should fetch user info from backend if not cached', async () => {
      const mockToken = 'valid_token';

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({ jwt_enc: 'encrypted' }) // getToken()
        .mockResolvedValueOnce({}); // user_info not cached

      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue(mockToken);
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(false);

      // Mock fetch response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUser),
      } as Response);

      const user = await getCurrentUser();

      expect(user).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/auth/me',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ user_info: mockUser });
    });

    it('should return null if not authenticated', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should clear token and return null if API returns 401', async () => {
      const mockToken = 'invalid_token';

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({ jwt_enc: 'encrypted' })
        .mockResolvedValueOnce({});

      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue(mockToken);
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(false);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      const user = await getCurrentUser();

      expect(user).toBeNull();
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('jwt_enc');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if valid token exists', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ jwt_enc: 'encrypted' });
      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue('valid_token');
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(false);

      const authenticated = await isAuthenticated();

      expect(authenticated).toBe(true);
    });

    it('should return false if no token exists', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const authenticated = await isAuthenticated();

      expect(authenticated).toBe(false);
    });

    it('should return false if token is expired', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ jwt_enc: 'encrypted' });
      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue('expired_token');
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(true);

      const authenticated = await isAuthenticated();

      expect(authenticated).toBe(false);
    });
  });

  describe('isPremiumUser', () => {
    it('should return true for premium subscription tier', async () => {
      const premiumUser: User = {
        id: 'user123',
        email: 'premium@example.com',
        subscription_tier: 'premium',
      };

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({ jwt_enc: 'encrypted' })
        .mockResolvedValueOnce({ user_info: premiumUser });

      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue('token');
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(false);

      const isPremium = await isPremiumUser();

      expect(isPremium).toBe(true);
    });

    it('should return true for family subscription tier', async () => {
      const familyUser: User = {
        id: 'user123',
        email: 'family@example.com',
        subscription_tier: 'family',
      };

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({ jwt_enc: 'encrypted' })
        .mockResolvedValueOnce({ user_info: familyUser });

      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue('token');
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(false);

      const isPremium = await isPremiumUser();

      expect(isPremium).toBe(true);
    });

    it('should return false for free subscription tier', async () => {
      const freeUser: User = {
        id: 'user123',
        email: 'free@example.com',
        subscription_tier: 'free',
      };

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({ jwt_enc: 'encrypted' })
        .mockResolvedValueOnce({ user_info: freeUser });

      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue('token');
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(false);

      const isPremium = await isPremiumUser();

      expect(isPremium).toBe(false);
    });

    it('should return false if not authenticated', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const isPremium = await isPremiumUser();

      expect(isPremium).toBe(false);
    });
  });

  describe('refreshUserInfo', () => {
    const mockUser: User = {
      id: 'user123',
      email: 'test@example.com',
      subscription_tier: 'premium',
    };

    it('should fetch and cache updated user info', async () => {
      const mockToken = 'valid_token';

      vi.mocked(chrome.storage.local.get).mockResolvedValue({ jwt_enc: 'encrypted' });
      vi.spyOn(crypto, 'getEncryptionKey').mockResolvedValue({} as CryptoKey);
      vi.spyOn(crypto, 'decryptToken').mockResolvedValue(mockToken);
      vi.spyOn(crypto, 'isTokenExpired').mockReturnValue(false);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUser),
      } as Response);

      await refreshUserInfo();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/auth/me',
        expect.any(Object)
      );
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ user_info: mockUser });
    });

    it('should do nothing if not authenticated', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      await refreshUserInfo();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('onAuthStateChanged', () => {
    it('should call callback when jwt_enc changes', () => {
      const callback = vi.fn();

      onAuthStateChanged(callback);

      // Simulate storage change
      const listener = vi.mocked(chrome.storage.onChanged.addListener).mock.calls[0][0];
      listener(
        { jwt_enc: { newValue: 'encrypted_token', oldValue: undefined } },
        'local'
      );

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should call callback with false when token is removed', () => {
      const callback = vi.fn();

      onAuthStateChanged(callback);

      const listener = vi.mocked(chrome.storage.onChanged.addListener).mock.calls[0][0];
      listener(
        { jwt_enc: { newValue: undefined, oldValue: 'encrypted_token' } },
        'local'
      );

      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should not call callback for other storage changes', () => {
      const callback = vi.fn();

      onAuthStateChanged(callback);

      const listener = vi.mocked(chrome.storage.onChanged.addListener).mock.calls[0][0];
      listener({ other_key: { newValue: 'value' } }, 'local');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not call callback for sync storage changes', () => {
      const callback = vi.fn();

      onAuthStateChanged(callback);

      const listener = vi.mocked(chrome.storage.onChanged.addListener).mock.calls[0][0];
      listener({ jwt_enc: { newValue: 'encrypted_token' } }, 'sync');

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
