/**
 * Unit Tests: Cryptography Functions
 *
 * Tests JWT token encryption, decryption, and validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  encryptToken,
  decryptToken,
  getEncryptionKey,
  isValidJWTFormat,
  parseJWTPayload,
  isTokenExpired,
} from '@/lib/crypto';

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('Crypto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('encryptToken and decryptToken', () => {
    it('should encrypt and decrypt token successfully', async () => {
      const originalToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
      const mockKey = {} as CryptoKey;

      // Mock crypto.subtle.encrypt to return predictable result
      const mockEncrypted = new ArrayBuffer(40); // 12 (IV) + 28 (data + tag)
      vi.spyOn(crypto.subtle, 'encrypt').mockResolvedValue(mockEncrypted);

      const encrypted = await encryptToken(originalToken, mockKey);

      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      expect(crypto.subtle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AES-GCM' }),
        mockKey,
        expect.any(Object) // Changed from Uint8Array as vi.fn doesn't preserve type info
      );
    });

    it('should successfully decrypt encrypted token', async () => {
      const originalToken = 'test_token_content';
      const mockKey = {} as CryptoKey;

      // Mock encryption
      const mockEncrypted = new ArrayBuffer(40);
      vi.spyOn(crypto.subtle, 'encrypt').mockResolvedValue(mockEncrypted);

      const encrypted = await encryptToken(originalToken, mockKey);

      // Mock decryption to return original token
      const encoder = new TextEncoder();
      const mockDecrypted = encoder.encode(originalToken).buffer;
      vi.spyOn(crypto.subtle, 'decrypt').mockResolvedValue(mockDecrypted);

      const decrypted = await decryptToken(encrypted, mockKey);

      expect(decrypted).toBe(originalToken);
      expect(crypto.subtle.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AES-GCM' }),
        mockKey,
        expect.any(Uint8Array)
      );
    });

    it('should throw error if encryption fails', async () => {
      const token = 'test_token';
      const mockKey = {} as CryptoKey;

      vi.spyOn(crypto.subtle, 'encrypt').mockRejectedValue(new Error('Encryption error'));

      await expect(encryptToken(token, mockKey)).rejects.toThrow('Token encryption failed');
    });

    it('should throw error if decryption fails', async () => {
      const encryptedToken = 'invalid_encrypted_data';
      const mockKey = {} as CryptoKey;

      vi.spyOn(crypto.subtle, 'decrypt').mockRejectedValue(new Error('Decryption error'));

      await expect(decryptToken(encryptedToken, mockKey)).rejects.toThrow('Token decryption failed');
    });

    it('should handle round-trip encryption/decryption', async () => {
      const originalToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.signature';
      const mockKey = {} as CryptoKey;

      // First call: encrypt
      const mockEncrypted = new ArrayBuffer(40);
      vi.spyOn(crypto.subtle, 'encrypt').mockResolvedValueOnce(mockEncrypted);

      const encrypted = await encryptToken(originalToken, mockKey);

      // Second call: decrypt
      const encoder = new TextEncoder();
      const mockDecrypted = encoder.encode(originalToken).buffer;
      vi.spyOn(crypto.subtle, 'decrypt').mockResolvedValueOnce(mockDecrypted);

      const decrypted = await decryptToken(encrypted, mockKey);

      expect(decrypted).toBe(originalToken);
    });
  });

  describe('getEncryptionKey', () => {
    it('should derive encryption key from Chrome profile ID', async () => {
      const mockProfileId = 'mock-chrome-profile-id';
      vi.mocked(chrome.identity.getProfileUserInfo).mockResolvedValue({
        id: mockProfileId,
        email: '',
      });

      const mockKeyMaterial = {} as CryptoKey;
      const mockDerivedKey = {} as CryptoKey;

      vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue(mockKeyMaterial);
      vi.spyOn(crypto.subtle, 'deriveKey').mockResolvedValue(mockDerivedKey);

      const key = await getEncryptionKey();

      expect(key).toBe(mockDerivedKey);
      expect(chrome.identity.getProfileUserInfo).toHaveBeenCalled();
      expect(crypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Object), // Changed from Uint8Array as vi.fn doesn't preserve type info
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      expect(crypto.subtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          iterations: 100000,
          hash: 'SHA-256',
        }),
        mockKeyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('should throw error if Chrome profile ID not available', async () => {
      vi.mocked(chrome.identity.getProfileUserInfo).mockResolvedValue({
        id: '',
        email: '',
      });

      await expect(getEncryptionKey()).rejects.toThrow('Encryption key generation failed');
    });

    it('should throw error if key derivation fails', async () => {
      vi.mocked(chrome.identity.getProfileUserInfo).mockResolvedValue({
        id: 'valid-id',
        email: '',
      });

      vi.spyOn(crypto.subtle, 'importKey').mockRejectedValue(new Error('Key import failed'));

      await expect(getEncryptionKey()).rejects.toThrow('Encryption key generation failed');
    });
  });

  describe('isValidJWTFormat', () => {
    it('should return true for valid JWT format', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
      expect(isValidJWTFormat(validToken)).toBe(true);
    });

    it('should return false for invalid JWT format (missing parts)', () => {
      expect(isValidJWTFormat('invalid.token')).toBe(false);
      expect(isValidJWTFormat('only_one_part')).toBe(false);
      expect(isValidJWTFormat('too.many.parts.here')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidJWTFormat('')).toBe(false);
    });
  });

  describe('parseJWTPayload', () => {
    it('should parse valid JWT payload', () => {
      // JWT with payload: {"sub":"1234567890","name":"John Doe","exp":9999999999}
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjo5OTk5OTk5OTk5fQ.signature';

      const payload = parseJWTPayload(token);

      expect(payload).toEqual({
        sub: '1234567890',
        name: 'John Doe',
        exp: 9999999999,
      });
    });

    it('should return null for invalid JWT format', () => {
      const invalidToken = 'invalid.token';

      const payload = parseJWTPayload(invalidToken);

      expect(payload).toBeNull();
    });

    it('should return null for malformed base64', () => {
      const malformedToken = 'header.invalid_base64!!!.signature';

      const payload = parseJWTPayload(malformedToken);

      expect(payload).toBeNull();
    });

    it('should parse payload with nested objects', () => {
      // Payload: {"sub":"123","data":{"role":"admin","permissions":["read","write"]}}
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJkYXRhIjp7InJvbGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbInJlYWQiLCJ3cml0ZSJdfX0.signature';

      const payload = parseJWTPayload(token);

      expect(payload).toEqual({
        sub: '123',
        data: {
          role: 'admin',
          permissions: ['read', 'write'],
        },
      });
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      // Token expires in year 2999 (exp: 32503680000)
      const futureToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjozMjUwMzY4MDAwMH0.signature';

      expect(isTokenExpired(futureToken)).toBe(false);
    });

    it('should return true for expired token', () => {
      // Token expired in year 2020 (exp: 1577836800)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTc3ODM2ODAwfQ.signature';

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should return true for token without exp claim', () => {
      // Token without exp claim
      const noExpToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.signature';

      expect(isTokenExpired(noExpToken)).toBe(true);
    });

    it('should return true for invalid token', () => {
      const invalidToken = 'invalid.token';

      expect(isTokenExpired(invalidToken)).toBe(true);
    });

    it('should return true for token expiring exactly now', () => {
      const nowSeconds = Math.floor(Date.now() / 1000);

      // Create token with exp = now (already expired by the time we check)
      const payload = btoa(JSON.stringify({ sub: '123', exp: nowSeconds }));
      const tokenNow = `header.${payload}.signature`;

      expect(isTokenExpired(tokenNow)).toBe(true);
    });

    it('should return false for token expiring in 1 hour', () => {
      const futureSeconds = Math.floor(Date.now() / 1000) + 3600; // +1 hour

      const payload = btoa(JSON.stringify({ sub: '123', exp: futureSeconds }));
      const futureToken = `header.${payload}.signature`;

      expect(isTokenExpired(futureToken)).toBe(false);
    });
  });
});
