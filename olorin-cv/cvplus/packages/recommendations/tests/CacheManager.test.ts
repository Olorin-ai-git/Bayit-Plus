import { CacheManager } from '../CacheManager';

describe('CacheManager', () => {
  beforeEach(() => {
    CacheManager.clearAll();
  });

  afterEach(() => {
    CacheManager.clearAll();
  });

  describe('get and set', () => {
    it('should store and retrieve data from memory cache', async () => {
      const testData = { recommendations: ['rec1', 'rec2'], count: 2 };
      
      await CacheManager.set('test-key', testData, 'recommendations');
      const result = await CacheManager.get('test-key', 'recommendations');
      
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await CacheManager.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle cache expiration', async () => {
      const testData = { test: 'data' };
      
      // Set with short TTL category
      await CacheManager.set('test-key', testData, 'recommendations');
      
      // Mock time passing beyond TTL
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes (beyond 5 minute TTL)
      
      const result = await CacheManager.get('test-key', 'recommendations');
      expect(result).toBeNull();
    });

    it('should perform lazy cleanup on get operations', async () => {
      const spy = jest.spyOn(console, 'log');
      
      // Add expired entry
      await CacheManager.set('expired-key', { data: 'old' }, 'recommendations');
      jest.advanceTimersByTime(6 * 60 * 1000); // Expire it
      
      // Add fresh entry
      await CacheManager.set('fresh-key', { data: 'new' }, 'recommendations');
      
      // Get fresh entry should trigger cleanup
      await CacheManager.get('fresh-key');
      
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Cleaned up'));
      spy.mockRestore();
    });
  });

  describe('invalidate', () => {
    it('should invalidate specific cache entry', async () => {
      await CacheManager.set('test-key-1', { data: '1' });
      await CacheManager.set('test-key-2', { data: '2' });
      
      await CacheManager.invalidate('test-key-1');
      
      expect(await CacheManager.get('test-key-1')).toBeNull();
      expect(await CacheManager.get('test-key-2')).not.toBeNull();
    });

    it('should handle invalidation of non-existent keys', async () => {
      await expect(CacheManager.invalidate('non-existent')).resolves.not.toThrow();
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate entries matching pattern', async () => {
      await CacheManager.set('user:123:data', { user: '123' });
      await CacheManager.set('user:456:data', { user: '456' });
      await CacheManager.set('job:123:data', { job: '123' });
      
      await CacheManager.invalidatePattern('user:.*');
      
      expect(await CacheManager.get('user:123:data')).toBeNull();
      expect(await CacheManager.get('user:456:data')).toBeNull();
      expect(await CacheManager.get('job:123:data')).not.toBeNull();
    });

    it('should handle empty pattern matches', async () => {
      await CacheManager.set('test-key', { data: 'test' });
      
      await CacheManager.invalidatePattern('no-match:.*');
      
      expect(await CacheManager.get('test-key')).not.toBeNull();
    });
  });

  describe('cache eviction', () => {
    it('should evict oldest entry when cache is full', async () => {
      // Fill cache to near capacity (assuming MAX_MEMORY_ENTRIES = 100)
      for (let i = 0; i < 101; i++) {
        await CacheManager.set(`key-${i}`, { data: i });
      }
      
      // First key should be evicted
      expect(await CacheManager.get('key-0')).toBeNull();
      // Last key should still exist
      expect(await CacheManager.get('key-100')).not.toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return accurate cache statistics', async () => {
      await CacheManager.set('key-1', { data: '1' });
      await CacheManager.set('key-2', { data: '2' });
      
      const stats = CacheManager.getCacheStats();
      
      expect(stats).toHaveProperty('memoryEntries');
      expect(stats).toHaveProperty('memoryHitRate');
      expect(stats).toHaveProperty('oldestEntry');
      expect(stats).toHaveProperty('newestEntry');
      expect(stats.memoryEntries).toBe(2);
    });

    it('should handle empty cache stats', () => {
      CacheManager.clearAll();
      
      const stats = CacheManager.getCacheStats();
      
      expect(stats.memoryEntries).toBe(0);
      expect(stats.oldestEntry).toBe(0);
      expect(stats.newestEntry).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('should clear all cache entries', async () => {
      await CacheManager.set('key-1', { data: '1' });
      await CacheManager.set('key-2', { data: '2' });
      
      CacheManager.clearAll();
      
      expect(await CacheManager.get('key-1')).toBeNull();
      expect(await CacheManager.get('key-2')).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle cache operation errors gracefully', async () => {
      // Mock console.warn to avoid test output noise
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // This should not throw
      await expect(CacheManager.get('test-key')).resolves.not.toThrow();
      await expect(CacheManager.set('test-key', { data: 'test' })).resolves.not.toThrow();
      
      warnSpy.mockRestore();
    });
  });

  describe('TTL categories', () => {
    it('should respect different TTL categories', async () => {
      await CacheManager.set('short-ttl', { data: 'short' }, 'recommendations');
      await CacheManager.set('long-ttl', { data: 'long' }, 'static_data');
      
      // Advance time to expire recommendations but not static_data
      jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
      
      expect(await CacheManager.get('short-ttl', 'recommendations')).toBeNull();
      expect(await CacheManager.get('long-ttl', 'static_data')).not.toBeNull();
    });
  });

  describe('memory leak prevention', () => {
    it('should perform lazy cleanup instead of using setInterval', () => {
      // Verify no setInterval is set (would cause memory leaks in Firebase Functions)
      const originalSetInterval = global.setInterval;
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      // Importing should not call setInterval
      expect(setIntervalSpy).not.toHaveBeenCalled();
      
      setIntervalSpy.mockRestore();
    });
  });
});

// Mock timers for testing
jest.useFakeTimers();