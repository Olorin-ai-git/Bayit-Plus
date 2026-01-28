/**
 * Usage Tracker
 *
 * Tracks dubbing session usage for quota enforcement
 * Syncs with backend server for server-side validation
 */

import { createLogger } from '@/lib/logger';
import { getToken } from './auth-manager';
import { CONFIG } from '@/config/constants';

const logger = createLogger('UsageTracker');

export interface UsageData {
  dailyMinutesUsed: number;
  lastResetDate: string; // ISO date string
  currentSessionId: string | null;
  currentSessionStartTime: number | null;
}

/**
 * Get current usage data
 */
export async function getUsageData(): Promise<UsageData> {
  try {
    const result = await chrome.storage.local.get('usage_data');

    if (!result.usage_data) {
      return {
        dailyMinutesUsed: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
        currentSessionId: null,
        currentSessionStartTime: null,
      };
    }

    const usage: UsageData = result.usage_data;

    // Reset if new day
    const today = new Date().toISOString().split('T')[0];
    if (usage.lastResetDate !== today) {
      logger.info('New day detected, resetting usage', {
        previousDate: usage.lastResetDate,
        currentDate: today,
      });

      const resetUsage: UsageData = {
        dailyMinutesUsed: 0,
        lastResetDate: today,
        currentSessionId: null,
        currentSessionStartTime: null,
      };

      await chrome.storage.local.set({ usage_data: resetUsage });
      return resetUsage;
    }

    return usage;
  } catch (error) {
    logger.error('Failed to get usage data', { error: String(error) });
    throw error;
  }
}

/**
 * Start tracking a dubbing session
 */
export async function startSession(sessionId: string): Promise<void> {
  try {
    const usage = await getUsageData();

    usage.currentSessionId = sessionId;
    usage.currentSessionStartTime = Date.now();

    await chrome.storage.local.set({ usage_data: usage });

    logger.info('Session started', { sessionId });
  } catch (error) {
    logger.error('Failed to start session', { error: String(error) });
    throw error;
  }
}

/**
 * End tracking a dubbing session
 */
export async function endSession(): Promise<number> {
  try {
    const usage = await getUsageData();

    if (!usage.currentSessionId || !usage.currentSessionStartTime) {
      logger.warn('No active session to end');
      return 0;
    }

    // Calculate session duration in minutes
    const durationMs = Date.now() - usage.currentSessionStartTime;
    const durationMinutes = durationMs / 60000;

    // Update local usage
    usage.dailyMinutesUsed += durationMinutes;
    usage.currentSessionId = null;
    usage.currentSessionStartTime = null;

    await chrome.storage.local.set({ usage_data: usage });

    logger.info('Session ended', {
      sessionId: usage.currentSessionId,
      durationMinutes: durationMinutes.toFixed(2),
      totalUsageToday: usage.dailyMinutesUsed.toFixed(2),
    });

    // Sync with backend (async, don't wait)
    syncUsageWithBackend().catch((error) => {
      logger.error('Failed to sync usage with backend', { error: String(error) });
    });

    return durationMinutes;
  } catch (error) {
    logger.error('Failed to end session', { error: String(error) });
    throw error;
  }
}

/**
 * Get current session duration in minutes
 */
export async function getCurrentSessionDuration(): Promise<number> {
  try {
    const usage = await getUsageData();

    if (!usage.currentSessionStartTime) {
      return 0;
    }

    const durationMs = Date.now() - usage.currentSessionStartTime;
    return durationMs / 60000;
  } catch (error) {
    logger.error('Failed to get current session duration', { error: String(error) });
    return 0;
  }
}

/**
 * Check if user has available quota
 */
export async function hasAvailableQuota(): Promise<boolean> {
  try {
    const usage = await getUsageData();

    // Free tier limit
    const freeLimit = CONFIG.QUOTA.FREE_TIER_MINUTES_PER_DAY;
    if (freeLimit === null) {
      logger.warn('Free tier limit not loaded from backend');
      return false;
    }

    return usage.dailyMinutesUsed < freeLimit;
  } catch (error) {
    logger.error('Failed to check quota', { error: String(error) });
    return false;
  }
}

/**
 * Get remaining quota in minutes
 */
export async function getRemainingQuota(): Promise<number> {
  try {
    const usage = await getUsageData();

    const freeLimit = CONFIG.QUOTA.FREE_TIER_MINUTES_PER_DAY;
    if (freeLimit === null) {
      return 0;
    }

    return Math.max(0, freeLimit - usage.dailyMinutesUsed);
  } catch (error) {
    logger.error('Failed to get remaining quota', { error: String(error) });
    return 0;
  }
}

/**
 * Sync usage with backend server
 * Server-side quota is source of truth
 */
export async function syncUsageWithBackend(): Promise<void> {
  try {
    const token = await getToken();
    if (!token) {
      logger.warn('Cannot sync usage: not authenticated');
      return;
    }

    const usage = await getUsageData();

    const response = await fetch(`${CONFIG.API.BASE_URL}/api/v1/dubbing/usage/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        daily_minutes_used: usage.dailyMinutesUsed,
        last_reset_date: usage.lastResetDate,
      }),
      signal: AbortSignal.timeout(CONFIG.API.TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Usage sync failed: ${response.status}`);
    }

    const serverUsage = await response.json();

    // Update local usage with server data (server is source of truth)
    if (serverUsage.daily_minutes_used !== usage.dailyMinutesUsed) {
      logger.warn('Local usage differs from server, updating', {
        local: usage.dailyMinutesUsed,
        server: serverUsage.daily_minutes_used,
      });

      usage.dailyMinutesUsed = serverUsage.daily_minutes_used;
      await chrome.storage.local.set({ usage_data: usage });
    }

    logger.info('Usage synced with backend', {
      dailyMinutesUsed: serverUsage.daily_minutes_used,
    });
  } catch (error) {
    logger.error('Failed to sync usage with backend', { error: String(error) });
    throw error;
  }
}

/**
 * Start periodic usage sync (called by service worker)
 */
export function startPeriodicSync(): void {
  const syncInterval = CONFIG.USAGE_TRACKING.SYNC_INTERVAL_MS;

  setInterval(() => {
    syncUsageWithBackend().catch((error) => {
      logger.error('Periodic sync failed', { error: String(error) });
    });
  }, syncInterval);

  logger.info('Periodic usage sync started', {
    intervalMs: syncInterval,
  });
}
