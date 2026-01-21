/**
 * Cache Manager Tests
 *
 * Tests for browser cache clearing functionality.
 * Ensures proper cache clearing with preservation of critical keys.
 */

import { clearBrowserCache, clearInvestigationCache } from '../cacheManager';

// Mock getRuntimeConfig
jest.mock('../../config/runtimeConfig', () => ({
  getRuntimeConfig: jest.fn((key, options = {}) => {
    const mockConfig: Record<string, string> = {
      'REACT_APP_CACHE_CLEAR_LOCAL_STORAGE': 'true',
      'REACT_APP_CACHE_CLEAR_SESSION_STORAGE': 'true',
      'REACT_APP_CACHE_CLEAR_HTTP_CACHE': 'true',
      'REACT_APP_CACHE_PRESERVE_LOCAL_STORAGE': 'auth-,user-profile',
      'REACT_APP_CACHE_PRESERVE_SESSION_STORAGE': 'csrf-token,session-id'
    };

    const value = mockConfig[key] || options.defaultValue;
    return options.parser ? options.parser(value) : value;
  })
}));

describe('cacheManager', () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('clearBrowserCache', () => {
    it('should clear localStorage while preserving specified keys', async () => {
      // Setup test data
      localStorage.setItem('auth-token', 'should-be-preserved');
      localStorage.setItem('user-profile', 'should-be-preserved');
      localStorage.setItem('investigation-123', 'should-be-cleared');
      localStorage.setItem('wizard-state-456', 'should-be-cleared');

      // Execute cache clearing
      await clearBrowserCache();

      // Verify preserved keys
      expect(localStorage.getItem('auth-token')).toBe('should-be-preserved');
      expect(localStorage.getItem('user-profile')).toBe('should-be-preserved');

      // Verify cleared keys
      expect(localStorage.getItem('investigation-123')).toBeNull();
      expect(localStorage.getItem('wizard-state-456')).toBeNull();
    });

    it('should clear sessionStorage while preserving specified keys', async () => {
      // Setup test data
      sessionStorage.setItem('csrf-token', 'should-be-preserved');
      sessionStorage.setItem('session-id', 'should-be-preserved');
      sessionStorage.setItem('temp-data-123', 'should-be-cleared');

      // Execute cache clearing
      await clearBrowserCache();

      // Verify preserved keys
      expect(sessionStorage.getItem('csrf-token')).toBe('should-be-preserved');
      expect(sessionStorage.getItem('session-id')).toBe('should-be-preserved');

      // Verify cleared keys
      expect(sessionStorage.getItem('temp-data-123')).toBeNull();
    });

    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw error
      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });

      localStorage.setItem('test-key', 'test-value');

      // Should not throw
      await expect(clearBrowserCache()).resolves.not.toThrow();

      // Restore original implementation
      Storage.prototype.removeItem = originalRemoveItem;
    });
  });

  describe('clearInvestigationCache', () => {
    it('should clear investigation-specific localStorage entries', async () => {
      // Setup test data
      localStorage.setItem('investigation-123-data', 'should-be-cleared');
      localStorage.setItem('wizard-state-storage', 'should-be-cleared');
      localStorage.setItem('auth-token', 'should-remain');

      // Execute investigation cache clearing
      await clearInvestigationCache('investigation-123');

      // Verify investigation entries cleared
      expect(localStorage.getItem('investigation-123-data')).toBeNull();
      expect(localStorage.getItem('wizard-state-storage')).toBeNull();

      // Verify non-investigation entries remain
      expect(localStorage.getItem('auth-token')).toBe('should-remain');
    });

    it('should clear all investigation entries when no ID provided', async () => {
      // Setup test data
      localStorage.setItem('investigation-abc-data', 'should-be-cleared');
      localStorage.setItem('investigation-xyz-data', 'should-be-cleared');
      localStorage.setItem('wizard-state-storage', 'should-be-cleared');
      localStorage.setItem('user-settings', 'should-remain');

      // Execute investigation cache clearing without specific ID
      await clearInvestigationCache();

      // Verify all investigation entries cleared
      expect(localStorage.getItem('investigation-abc-data')).toBeNull();
      expect(localStorage.getItem('investigation-xyz-data')).toBeNull();
      expect(localStorage.getItem('wizard-state-storage')).toBeNull();

      // Verify non-investigation entries remain
      expect(localStorage.getItem('user-settings')).toBe('should-remain');
    });

    it('should handle errors gracefully', async () => {
      // Mock localStorage.removeItem to throw error
      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });

      localStorage.setItem('investigation-123', 'test-value');

      // Should not throw
      await expect(clearInvestigationCache('investigation-123')).resolves.not.toThrow();

      // Restore original implementation
      Storage.prototype.removeItem = originalRemoveItem;
    });
  });
});
