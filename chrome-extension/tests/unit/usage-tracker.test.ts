/**
 * Unit Tests: Usage Tracker
 *
 * Tests dubbing session usage tracking and quota management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getUsageData,
  startSession,
  endSession,
  getCurrentSessionDuration,
  hasAvailableQuota,
  getRemainingQuota,
  syncUsageWithBackend,
  startPeriodicSync,
  type UsageData,
} from '@/background/usage-tracker';
import * as authManager from '@/background/auth-manager';

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
    QUOTA: {
      FREE_TIER_MINUTES_PER_DAY: 5.0,
    },
    USAGE_TRACKING: {
      SYNC_INTERVAL_MS: 10000,
    },
  },
}));

describe('UsageTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('getUsageData', () => {
    it('should return default usage data if none stored', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const usage = await getUsageData();

      expect(usage).toEqual({
        dailyMinutesUsed: 0,
        lastResetDate: expect.any(String),
        currentSessionId: null,
        currentSessionStartTime: null,
      });
      expect(usage.lastResetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    });

    it('should return stored usage data if available', async () => {
      const storedUsage: UsageData = {
        dailyMinutesUsed: 2.5,
        lastResetDate: '2026-01-28',
        currentSessionId: 'session123',
        currentSessionStartTime: Date.now() - 60000,
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: storedUsage,
      });

      // Mock date to match stored date
      vi.setSystemTime(new Date('2026-01-28T12:00:00Z'));

      const usage = await getUsageData();

      expect(usage).toEqual(storedUsage);
    });

    it('should reset usage data if new day detected', async () => {
      const yesterdayUsage: UsageData = {
        dailyMinutesUsed: 4.5,
        lastResetDate: '2026-01-27',
        currentSessionId: null,
        currentSessionStartTime: null,
      };

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: yesterdayUsage,
      });

      // Set current date to next day
      vi.setSystemTime(new Date('2026-01-28T00:00:00Z'));

      const usage = await getUsageData();

      expect(usage).toEqual({
        dailyMinutesUsed: 0,
        lastResetDate: '2026-01-28',
        currentSessionId: null,
        currentSessionStartTime: null,
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_data: expect.objectContaining({
          dailyMinutesUsed: 0,
          lastResetDate: '2026-01-28',
        }),
      });
    });
  });

  describe('startSession', () => {
    it('should start a new session and store session ID', async () => {
      const sessionId = 'session-abc123';
      const currentTime = Date.now();
      vi.setSystemTime(currentTime);

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 1.0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      await startSession(sessionId);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_data: expect.objectContaining({
          currentSessionId: sessionId,
          currentSessionStartTime: currentTime,
        }),
      });
    });

    it('should preserve existing usage data when starting session', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 2.5,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      await startSession('new-session');

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_data: expect.objectContaining({
          dailyMinutesUsed: 2.5,
          lastResetDate: '2026-01-28',
        }),
      });
    });
  });

  describe('endSession', () => {
    it('should calculate session duration and update usage', async () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 1.0,
          lastResetDate: '2026-01-28',
          currentSessionId: 'session123',
          currentSessionStartTime: startTime,
        },
      });

      // Advance time by 3 minutes
      vi.advanceTimersByTime(3 * 60 * 1000);

      // Mock syncUsageWithBackend
      vi.spyOn(authManager, 'getToken').mockResolvedValue('mock-token');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ daily_minutes_used: 4.0 }),
      } as Response);

      const duration = await endSession();

      expect(duration).toBeCloseTo(3.0, 1);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_data: expect.objectContaining({
          dailyMinutesUsed: 4.0, // 1.0 + 3.0
          currentSessionId: null,
          currentSessionStartTime: null,
        }),
      });
    });

    it('should return 0 if no active session', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 1.0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      const duration = await endSession();

      expect(duration).toBe(0);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should sync usage with backend after ending session', async () => {
      const startTime = Date.now();

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 0,
          lastResetDate: '2026-01-28',
          currentSessionId: 'session123',
          currentSessionStartTime: startTime,
        },
      });

      vi.setSystemTime(startTime + 60000); // +1 minute

      vi.spyOn(authManager, 'getToken').mockResolvedValue('mock-token');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ daily_minutes_used: 1.0 }),
      } as Response);

      await endSession();

      // Wait for async sync
      await vi.runAllTimersAsync();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/dubbing/usage/sync',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });

  describe('getCurrentSessionDuration', () => {
    it('should return current session duration in minutes', async () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 0,
          lastResetDate: '2026-01-28',
          currentSessionId: 'session123',
          currentSessionStartTime: startTime,
        },
      });

      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);

      const duration = await getCurrentSessionDuration();

      expect(duration).toBeCloseTo(5.0, 1);
    });

    it('should return 0 if no active session', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      const duration = await getCurrentSessionDuration();

      expect(duration).toBe(0);
    });
  });

  describe('hasAvailableQuota', () => {
    it('should return true if usage below limit', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 3.0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      const hasQuota = await hasAvailableQuota();

      expect(hasQuota).toBe(true);
    });

    it('should return false if usage at limit', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 5.0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      const hasQuota = await hasAvailableQuota();

      expect(hasQuota).toBe(false);
    });

    it('should return false if usage exceeds limit', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 6.0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      const hasQuota = await hasAvailableQuota();

      expect(hasQuota).toBe(false);
    });
  });

  describe('getRemainingQuota', () => {
    it('should return remaining quota in minutes', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 2.0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      const remaining = await getRemainingQuota();

      expect(remaining).toBe(3.0); // 5.0 - 2.0
    });

    it('should return 0 if quota exhausted', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 5.0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      const remaining = await getRemainingQuota();

      expect(remaining).toBe(0);
    });

    it('should return 0 if quota exceeded (negative case)', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 6.0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      const remaining = await getRemainingQuota();

      expect(remaining).toBe(0); // Math.max(0, -1) = 0
    });
  });

  describe('syncUsageWithBackend', () => {
    it('should send usage data to backend and update local storage', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 2.5,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      vi.spyOn(authManager, 'getToken').mockResolvedValue('mock-token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ daily_minutes_used: 3.0 }),
      } as Response);

      await syncUsageWithBackend();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/dubbing/usage/sync',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            daily_minutes_used: 2.5,
            last_reset_date: '2026-01-28',
          }),
        })
      );

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_data: expect.objectContaining({
          dailyMinutesUsed: 3.0, // Updated from server
        }),
      });
    });

    it('should not sync if not authenticated', async () => {
      vi.spyOn(authManager, 'getToken').mockResolvedValue(null);

      await syncUsageWithBackend();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if sync fails', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 2.0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      vi.spyOn(authManager, 'getToken').mockResolvedValue('mock-token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(syncUsageWithBackend()).rejects.toThrow('Usage sync failed: 500');
    });

    it('should not update local storage if server data matches', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 2.5,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      vi.spyOn(authManager, 'getToken').mockResolvedValue('mock-token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ daily_minutes_used: 2.5 }), // Same as local
      } as Response);

      await syncUsageWithBackend();

      // Storage.set should not be called since data matches
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('startPeriodicSync', () => {
    it('should start periodic syncing at configured interval', async () => {
      vi.spyOn(authManager, 'getToken').mockResolvedValue('mock-token');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ daily_minutes_used: 0 }),
      } as Response);

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        usage_data: {
          dailyMinutesUsed: 0,
          lastResetDate: '2026-01-28',
          currentSessionId: null,
          currentSessionStartTime: null,
        },
      });

      startPeriodicSync();

      // Advance time by 10 seconds (sync interval)
      await vi.advanceTimersByTimeAsync(10000);

      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance another 10 seconds
      await vi.advanceTimersByTimeAsync(10000);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
