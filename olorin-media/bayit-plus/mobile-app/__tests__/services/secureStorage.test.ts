/**
 * Secure Storage Service Tests
 *
 * Tests for iOS Keychain credential storage
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { secureStorageService, OAuthCredentials } from '../../src/services/secureStorageService';

// Keychain is mocked in jest.setup.ts

describe('SecureStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset migration flag
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('initialize', () => {
    it('should run migration from AsyncStorage when needed', async () => {
      const mockCredentials: OAuthCredentials = {
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
        expiresAt: Date.now() + 3600000,
        userId: 'user-123',
      };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null) // migration flag
        .mockResolvedValueOnce(mockCredentials.accessToken)
        .mockResolvedValueOnce(mockCredentials.refreshToken)
        .mockResolvedValueOnce(mockCredentials.expiresAt?.toString())
        .mockResolvedValueOnce(mockCredentials.userId);

      await secureStorageService.initialize();

      expect(Keychain.setGenericPassword).toHaveBeenCalled();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('keychain_migration_complete', 'true');
    });

    it('should skip migration when already complete', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('true');

      await secureStorageService.initialize();

      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
    });

    it('should handle migration when no AsyncStorage credentials exist', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null) // migration flag
        .mockResolvedValueOnce(null); // no access token

      await secureStorageService.initialize();

      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('keychain_migration_complete', 'true');
    });
  });

  describe('storeOAuthCredentials', () => {
    it('should store credentials in Keychain', async () => {
      const credentials: OAuthCredentials = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
        userId: 'user-123',
      };

      await secureStorageService.storeOAuthCredentials(credentials);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'BayitPlus',
        JSON.stringify(credentials),
        expect.objectContaining({
          service: 'BayitPlus',
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        })
      );
    });

    it('should throw error when Keychain fails', async () => {
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValueOnce(false);

      const credentials: OAuthCredentials = {
        accessToken: 'test-token',
      };

      await expect(secureStorageService.storeOAuthCredentials(credentials)).rejects.toThrow(
        'Failed to securely store credentials'
      );
    });
  });

  describe('getOAuthCredentials', () => {
    it('should retrieve credentials from Keychain', async () => {
      const credentials: OAuthCredentials = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
        userId: 'user-123',
      };

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        username: 'BayitPlus',
        password: JSON.stringify(credentials),
      });

      const result = await secureStorageService.getOAuthCredentials();

      expect(result).toEqual(credentials);
    });

    it('should return null when no credentials stored', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce(false);

      const result = await secureStorageService.getOAuthCredentials();

      expect(result).toBeNull();
    });

    it('should return null on Keychain error', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockRejectedValueOnce(new Error('Keychain error'));

      const result = await secureStorageService.getOAuthCredentials();

      expect(result).toBeNull();
    });
  });

  describe('deleteOAuthCredentials', () => {
    it('should delete credentials from Keychain', async () => {
      await secureStorageService.deleteOAuthCredentials();

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'BayitPlus',
      });
    });

    it('should throw error when deletion fails', async () => {
      (Keychain.resetGenericPassword as jest.Mock).mockRejectedValueOnce(new Error('Delete failed'));

      await expect(secureStorageService.deleteOAuthCredentials()).rejects.toThrow(
        'Failed to delete credentials'
      );
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when no credentials', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce(false);

      const result = await secureStorageService.isTokenExpired();

      expect(result).toBe(true);
    });

    it('should return true when no expiry set', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        username: 'BayitPlus',
        password: JSON.stringify({ accessToken: 'token' }),
      });

      const result = await secureStorageService.isTokenExpired();

      expect(result).toBe(true);
    });

    it('should return false when token not expired', async () => {
      const futureExpiry = Date.now() + 3600000; // 1 hour in future
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        username: 'BayitPlus',
        password: JSON.stringify({ accessToken: 'token', expiresAt: futureExpiry }),
      });

      const result = await secureStorageService.isTokenExpired();

      expect(result).toBe(false);
    });

    it('should return true when token expired', async () => {
      const pastExpiry = Date.now() - 3600000; // 1 hour in past
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        username: 'BayitPlus',
        password: JSON.stringify({ accessToken: 'token', expiresAt: pastExpiry }),
      });

      const result = await secureStorageService.isTokenExpired();

      expect(result).toBe(true);
    });
  });

  describe('getValidAccessToken', () => {
    it('should return token when valid', async () => {
      const futureExpiry = Date.now() + 3600000;
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        username: 'BayitPlus',
        password: JSON.stringify({ accessToken: 'valid-token', expiresAt: futureExpiry }),
      });

      const result = await secureStorageService.getValidAccessToken();

      expect(result).toBe('valid-token');
    });

    it('should return null when no credentials', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce(false);

      const result = await secureStorageService.getValidAccessToken();

      expect(result).toBeNull();
    });

    it('should return null when token expired', async () => {
      const pastExpiry = Date.now() - 3600000;
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        username: 'BayitPlus',
        password: JSON.stringify({ accessToken: 'expired-token', expiresAt: pastExpiry }),
      });

      const result = await secureStorageService.getValidAccessToken();

      expect(result).toBeNull();
    });
  });

  describe('getBiometricType', () => {
    it('should return biometry type when available', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValueOnce(Keychain.BIOMETRY_TYPE.FACE_ID);

      const result = await secureStorageService.getBiometricType();

      expect(result).toBe(Keychain.BIOMETRY_TYPE.FACE_ID);
    });

    it('should return null when no biometry available', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValueOnce(null);

      const result = await secureStorageService.getBiometricType();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockRejectedValueOnce(new Error('Biometry error'));

      const result = await secureStorageService.getBiometricType();

      expect(result).toBeNull();
    });
  });
});
