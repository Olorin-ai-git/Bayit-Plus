/**
 * OfflineCacheService Tests
 *
 * Tests the offline caching service for persisting content:
 * - set/get/delete operations
 * - Category-based caching
 * - Cache expiration
 * - Size limit enforcement
 * - clearCategory and clearAll
 * - Cache statistics
 * - Expired entry cleanup
 * - Cache index management
 * - Error handling for AsyncStorage failures
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineCacheService } from '../offlineCacheService';

// AsyncStorage is already mocked in jest.setup.ts but we need getAllKeys
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Add getAllKeys mock since jest.setup.ts does not include it
beforeAll(() => {
  if (!mockAsyncStorage.getAllKeys) {
    (mockAsyncStorage as any).getAllKeys = jest.fn().mockResolvedValue([]);
  }
});

describe('offlineCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockAsyncStorage.multiRemove.mockResolvedValue(undefined);
    (mockAsyncStorage as any).getAllKeys.mockResolvedValue([]);
  });

  describe('set', () => {
    test('should store data with correct cache key', async () => {
      const data = { title: 'Featured Movie', id: '1' };

      await offlineCacheService.set('movies', data, 'featured');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@bayit_offline_cache_featured:movies',
        expect.any(String)
      );
    });

    test('should include timestamp and expiration in cache entry', async () => {
      const data = { title: 'Test' };
      const beforeTime = Date.now();

      await offlineCacheService.set('test-key', data, 'featured');

      const storedCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === '@bayit_offline_cache_featured:test-key'
      );
      expect(storedCall).toBeDefined();

      const storedEntry = JSON.parse(storedCall![1] as string);
      expect(storedEntry.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(storedEntry.expiresAt).toBeGreaterThan(storedEntry.timestamp);
      expect(storedEntry.data).toEqual(data);
      expect(storedEntry.key).toBe('test-key');
      expect(storedEntry.category).toBe('featured');
    });

    test('should reject data exceeding category size limit', async () => {
      // Create data larger than 500KB (featured limit)
      const largeData = 'x'.repeat(1024 * 501);

      await offlineCacheService.set('large-key', largeData, 'featured');

      // Should not have stored anything (besides possibly the index update)
      const dataStoreCalls = mockAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === '@bayit_offline_cache_featured:large-key'
      );
      expect(dataStoreCalls).toHaveLength(0);
    });

    test('should use default category when not specified', async () => {
      await offlineCacheService.set('default-key', { value: 1 });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@bayit_offline_cache_featured:default-key',
        expect.any(String)
      );
    });

    test('should update cache index after storing data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await offlineCacheService.set('indexed-key', { value: 1 }, 'categories');

      // Should store both the cache entry and the metadata
      const metadataCalls = mockAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === '@bayit_cache_metadata'
      );
      expect(metadataCalls.length).toBeGreaterThan(0);
    });

    test('should not throw on AsyncStorage failure', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      await expect(
        offlineCacheService.set('fail-key', { data: 1 }, 'featured')
      ).resolves.toBeUndefined();
    });
  });

  describe('get', () => {
    test('should retrieve cached data', async () => {
      const cachedEntry = {
        key: 'test-key',
        category: 'featured',
        data: { title: 'Cached Movie' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        size: 50,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedEntry));

      const result = await offlineCacheService.get('test-key', 'featured');

      expect(result).toEqual({ title: 'Cached Movie' });
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        '@bayit_offline_cache_featured:test-key'
      );
    });

    test('should return null for non-existent key', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await offlineCacheService.get('missing-key', 'featured');

      expect(result).toBeNull();
    });

    test('should return null and delete expired entry', async () => {
      const expiredEntry = {
        key: 'expired-key',
        category: 'featured',
        data: { title: 'Old Movie' },
        timestamp: Date.now() - 7200000,
        expiresAt: Date.now() - 3600000, // Expired 1 hour ago
        size: 50,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredEntry));

      const result = await offlineCacheService.get('expired-key', 'featured');

      expect(result).toBeNull();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@bayit_offline_cache_featured:expired-key'
      );
    });

    test('should use default category when not specified', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await offlineCacheService.get('default-key');

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        '@bayit_offline_cache_featured:default-key'
      );
    });

    test('should return null on AsyncStorage failure', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Read error'));

      const result = await offlineCacheService.get('error-key', 'featured');

      expect(result).toBeNull();
    });

    test('should return null for corrupted JSON', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('not-valid-json{{{');

      const result = await offlineCacheService.get('corrupt-key', 'featured');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    test('should remove cache entry by key and category', async () => {
      await offlineCacheService.delete('remove-key', 'search');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@bayit_offline_cache_search:remove-key'
      );
    });

    test('should update cache index after deletion', async () => {
      const metadata = {
        version: '1.0.0',
        createdAt: Date.now(),
        entries: {
          'search:remove-key': {
            key: 'remove-key',
            category: 'search',
            timestamp: Date.now(),
            expiresAt: Date.now() + 3600000,
            size: 50,
          },
        },
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(metadata));

      await offlineCacheService.delete('remove-key', 'search');

      const metadataUpdateCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === '@bayit_cache_metadata'
      );
      expect(metadataUpdateCall).toBeDefined();

      const updatedMetadata = JSON.parse(metadataUpdateCall![1] as string);
      expect(updatedMetadata.entries['search:remove-key']).toBeUndefined();
    });

    test('should not throw on deletion failure', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Delete failed'));

      await expect(
        offlineCacheService.delete('fail-key', 'featured')
      ).resolves.toBeUndefined();
    });
  });

  describe('clearCategory', () => {
    test('should remove all entries for a category', async () => {
      (mockAsyncStorage as any).getAllKeys.mockResolvedValue([
        '@bayit_offline_cache_search:query1',
        '@bayit_offline_cache_search:query2',
        '@bayit_offline_cache_featured:movie1',
      ]);

      await offlineCacheService.clearCategory('search');

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@bayit_offline_cache_search:query1',
        '@bayit_offline_cache_search:query2',
      ]);
    });

    test('should not remove entries from other categories', async () => {
      (mockAsyncStorage as any).getAllKeys.mockResolvedValue([
        '@bayit_offline_cache_featured:movie1',
        '@bayit_offline_cache_categories:drama',
      ]);

      await offlineCacheService.clearCategory('search');

      // No keys to remove, so multiRemove should not be called
      expect(mockAsyncStorage.multiRemove).not.toHaveBeenCalled();
    });

    test('should update metadata after clearing category', async () => {
      (mockAsyncStorage as any).getAllKeys.mockResolvedValue([
        '@bayit_offline_cache_search:query1',
      ]);

      const metadata = {
        version: '1.0.0',
        createdAt: Date.now(),
        entries: {
          'search:query1': { key: 'query1', category: 'search', timestamp: Date.now(), expiresAt: Date.now() + 3600000, size: 50 },
          'featured:movie1': { key: 'movie1', category: 'featured', timestamp: Date.now(), expiresAt: Date.now() + 3600000, size: 50 },
        },
      };
      // First call for getAllKeys, subsequent for getItem (metadata)
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(metadata));

      await offlineCacheService.clearCategory('search');

      const metadataUpdateCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === '@bayit_cache_metadata'
      );
      expect(metadataUpdateCall).toBeDefined();

      const updatedMetadata = JSON.parse(metadataUpdateCall![1] as string);
      expect(updatedMetadata.entries['search:query1']).toBeUndefined();
      expect(updatedMetadata.entries['featured:movie1']).toBeDefined();
    });

    test('should not throw on failure', async () => {
      (mockAsyncStorage as any).getAllKeys.mockRejectedValue(new Error('Storage error'));

      await expect(
        offlineCacheService.clearCategory('search')
      ).resolves.toBeUndefined();
    });
  });

  describe('clearAll', () => {
    test('should remove all cache entries', async () => {
      (mockAsyncStorage as any).getAllKeys.mockResolvedValue([
        '@bayit_offline_cache_featured:movie1',
        '@bayit_offline_cache_search:query1',
        '@other_app_key',
      ]);

      await offlineCacheService.clearAll();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@bayit_offline_cache_featured:movie1',
        '@bayit_offline_cache_search:query1',
      ]);
    });

    test('should remove metadata and index keys', async () => {
      (mockAsyncStorage as any).getAllKeys.mockResolvedValue([]);

      await offlineCacheService.clearAll();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@bayit_cache_metadata');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@bayit_cache_index');
    });

    test('should not remove keys from other apps', async () => {
      (mockAsyncStorage as any).getAllKeys.mockResolvedValue([
        '@other_app_settings',
        '@user_preferences',
      ]);

      await offlineCacheService.clearAll();

      // multiRemove should not be called since no cache keys match
      expect(mockAsyncStorage.multiRemove).not.toHaveBeenCalled();
    });

    test('should not throw on failure', async () => {
      (mockAsyncStorage as any).getAllKeys.mockRejectedValue(new Error('Storage error'));

      await expect(offlineCacheService.clearAll()).resolves.toBeUndefined();
    });
  });

  describe('getStats', () => {
    test('should return zero stats when no metadata exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const stats = await offlineCacheService.getStats();

      expect(stats.totalSize).toBe(0);
      expect(stats.entriesCount).toBe(0);
      expect(stats.byCategory).toEqual({});
    });

    test('should compute stats from metadata', async () => {
      const metadata = {
        version: '1.0.0',
        createdAt: Date.now(),
        entries: {
          'featured:movie1': { key: 'movie1', category: 'featured', timestamp: Date.now(), expiresAt: Date.now() + 3600000, size: 500 },
          'featured:movie2': { key: 'movie2', category: 'featured', timestamp: Date.now(), expiresAt: Date.now() + 3600000, size: 300 },
          'search:query1': { key: 'query1', category: 'search', timestamp: Date.now(), expiresAt: Date.now() + 3600000, size: 200 },
        },
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(metadata));

      const stats = await offlineCacheService.getStats();

      expect(stats.totalSize).toBe(1000);
      expect(stats.entriesCount).toBe(3);
      expect(stats.byCategory.featured.count).toBe(2);
      expect(stats.byCategory.featured.size).toBe(800);
      expect(stats.byCategory.search.count).toBe(1);
      expect(stats.byCategory.search.size).toBe(200);
    });

    test('should return zero stats on error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Read error'));

      const stats = await offlineCacheService.getStats();

      expect(stats.totalSize).toBe(0);
      expect(stats.entriesCount).toBe(0);
      expect(stats.byCategory).toEqual({});
    });
  });

  describe('cleanupExpired', () => {
    test('should remove expired entries and return count', async () => {
      const metadata = {
        version: '1.0.0',
        createdAt: Date.now(),
        entries: {
          'featured:expired1': {
            key: 'expired1',
            category: 'featured',
            timestamp: Date.now() - 7200000,
            expiresAt: Date.now() - 3600000,
            size: 100,
          },
          'featured:valid1': {
            key: 'valid1',
            category: 'featured',
            timestamp: Date.now(),
            expiresAt: Date.now() + 3600000,
            size: 100,
          },
        },
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(metadata));

      const removed = await offlineCacheService.cleanupExpired();

      expect(removed).toBe(1);
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@bayit_offline_cache_featured:expired1',
      ]);
    });

    test('should return 0 when no metadata exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const removed = await offlineCacheService.cleanupExpired();

      expect(removed).toBe(0);
    });

    test('should return 0 when no entries are expired', async () => {
      const metadata = {
        version: '1.0.0',
        createdAt: Date.now(),
        entries: {
          'featured:valid1': {
            key: 'valid1',
            category: 'featured',
            timestamp: Date.now(),
            expiresAt: Date.now() + 3600000,
            size: 100,
          },
        },
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(metadata));

      const removed = await offlineCacheService.cleanupExpired();

      expect(removed).toBe(0);
      expect(mockAsyncStorage.multiRemove).not.toHaveBeenCalled();
    });

    test('should remove metadata key when all entries are expired', async () => {
      const metadata = {
        version: '1.0.0',
        createdAt: Date.now(),
        entries: {
          'featured:expired1': {
            key: 'expired1',
            category: 'featured',
            timestamp: Date.now() - 7200000,
            expiresAt: Date.now() - 100,
            size: 100,
          },
        },
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(metadata));

      await offlineCacheService.cleanupExpired();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@bayit_cache_metadata');
    });

    test('should update metadata when some entries remain', async () => {
      const metadata = {
        version: '1.0.0',
        createdAt: Date.now(),
        entries: {
          'featured:expired1': {
            key: 'expired1',
            category: 'featured',
            timestamp: Date.now() - 7200000,
            expiresAt: Date.now() - 100,
            size: 100,
          },
          'featured:valid1': {
            key: 'valid1',
            category: 'featured',
            timestamp: Date.now(),
            expiresAt: Date.now() + 3600000,
            size: 200,
          },
        },
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(metadata));

      await offlineCacheService.cleanupExpired();

      const metadataUpdateCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === '@bayit_cache_metadata'
      );
      expect(metadataUpdateCall).toBeDefined();

      const updatedMetadata = JSON.parse(metadataUpdateCall![1] as string);
      expect(updatedMetadata.entries['featured:expired1']).toBeUndefined();
      expect(updatedMetadata.entries['featured:valid1']).toBeDefined();
    });

    test('should return 0 on error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Read error'));

      const removed = await offlineCacheService.cleanupExpired();

      expect(removed).toBe(0);
    });
  });

  describe('_updateCacheIndex', () => {
    test('should create new metadata when none exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const entry = {
        key: 'new-key',
        category: 'featured',
        data: { title: 'New Item' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        size: 50,
      };

      await offlineCacheService._updateCacheIndex(entry);

      const metadataCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === '@bayit_cache_metadata'
      );
      expect(metadataCall).toBeDefined();

      const metadata = JSON.parse(metadataCall![1] as string);
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.entries['featured:new-key']).toBeDefined();
      expect(metadata.entries['featured:new-key'].key).toBe('new-key');
      // Should not include data field in index
      expect(metadata.entries['featured:new-key'].data).toBeUndefined();
    });

    test('should update existing metadata', async () => {
      const existingMetadata = {
        version: '1.0.0',
        createdAt: Date.now() - 10000,
        entries: {
          'featured:existing': {
            key: 'existing',
            category: 'featured',
            timestamp: Date.now() - 5000,
            expiresAt: Date.now() + 3600000,
            size: 30,
          },
        },
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingMetadata));

      const newEntry = {
        key: 'new-key',
        category: 'search',
        data: { query: 'test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 1800000,
        size: 20,
      };

      await offlineCacheService._updateCacheIndex(newEntry);

      const metadataCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === '@bayit_cache_metadata'
      );
      const updatedMetadata = JSON.parse(metadataCall![1] as string);

      expect(updatedMetadata.entries['featured:existing']).toBeDefined();
      expect(updatedMetadata.entries['search:new-key']).toBeDefined();
    });
  });

  describe('_removeFromCacheIndex', () => {
    test('should remove entry from metadata', async () => {
      const metadata = {
        version: '1.0.0',
        createdAt: Date.now(),
        entries: {
          'featured:remove-me': {
            key: 'remove-me',
            category: 'featured',
            timestamp: Date.now(),
            expiresAt: Date.now() + 3600000,
            size: 50,
          },
          'featured:keep-me': {
            key: 'keep-me',
            category: 'featured',
            timestamp: Date.now(),
            expiresAt: Date.now() + 3600000,
            size: 50,
          },
        },
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(metadata));

      await offlineCacheService._removeFromCacheIndex('remove-me', 'featured');

      const metadataCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === '@bayit_cache_metadata'
      );
      const updatedMetadata = JSON.parse(metadataCall![1] as string);

      expect(updatedMetadata.entries['featured:remove-me']).toBeUndefined();
      expect(updatedMetadata.entries['featured:keep-me']).toBeDefined();
    });

    test('should handle missing metadata gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await expect(
        offlineCacheService._removeFromCacheIndex('any-key', 'featured')
      ).resolves.toBeUndefined();

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
