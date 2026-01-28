/**
 * Usage Store
 *
 * Manages usage tracking and quota state using Zustand
 */

import { create } from 'zustand';
import { apiClient } from '../../lib/api-client';
import { CONFIG } from '../../config/constants';
import { logger } from '../../lib/logger';
import type { QuotaCheckResponse } from '../../types/api';

interface UsageState {
  // State
  minutesUsed: number;
  minutesTotal: number;
  minutesRemaining: number;
  isPremium: boolean;
  resetAt: string | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  usagePercentage: number;
  hasQuota: boolean;

  // Actions
  initialize: () => Promise<void>;
  checkQuota: () => Promise<void>;
  syncUsage: (minutesUsed: number) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  clearError: () => void;
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Usage tracking store
 */
export const useUsageStore = create<UsageState>((set, get) => ({
  // Initial state
  minutesUsed: 0,
  minutesTotal: CONFIG.QUOTA.FREE_TIER_MINUTES_PER_DAY || 5,
  minutesRemaining: CONFIG.QUOTA.FREE_TIER_MINUTES_PER_DAY || 5,
  isPremium: false,
  resetAt: null,
  isLoading: true,
  error: null,

  // Computed properties
  get usagePercentage() {
    const { minutesUsed, minutesTotal, isPremium } = get();
    if (isPremium) return 0; // Premium users have unlimited
    return Math.min((minutesUsed / minutesTotal) * 100, 100);
  },

  get hasQuota() {
    const { minutesRemaining, isPremium } = get();
    return isPremium || minutesRemaining > 0;
  },

  /**
   * Initialize usage state
   */
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Initialize API client
      await apiClient.initialize();

      // Check quota
      await get().checkQuota();

      set({ isLoading: false });

      logger.info('Usage state initialized', {
        minutesUsed: get().minutesUsed,
        minutesTotal: get().minutesTotal,
        isPremium: get().isPremium,
      });
    } catch (error) {
      logger.error('Failed to initialize usage state', { error: String(error) });
      set({
        error: String(error),
        isLoading: false,
      });
    }
  },

  /**
   * Check quota from server
   */
  checkQuota: async () => {
    try {
      const quota: QuotaCheckResponse = await apiClient.checkQuota();

      set({
        minutesUsed: quota.minutes_used,
        minutesTotal: quota.minutes_total,
        minutesRemaining: quota.minutes_remaining,
        isPremium: quota.is_premium,
        resetAt: quota.reset_at,
        error: null,
      });

      logger.debug('Quota checked', {
        used: quota.minutes_used,
        remaining: quota.minutes_remaining,
        isPremium: quota.is_premium,
      });
    } catch (error) {
      logger.error('Failed to check quota', { error: String(error) });
      set({ error: String(error) });
    }
  },

  /**
   * Sync usage with server
   */
  syncUsage: async (minutesUsed: number) => {
    try {
      const result = await apiClient.syncUsage({ daily_minutes_used: minutesUsed });

      set({
        minutesUsed: result.daily_minutes_used,
        minutesRemaining: result.quota_remaining,
        isPremium: result.is_premium,
        error: null,
      });

      logger.debug('Usage synced', {
        serverUsage: result.daily_minutes_used,
        clientUsage: minutesUsed,
      });
    } catch (error) {
      logger.error('Failed to sync usage', { error: String(error) });
      set({ error: String(error) });
    }
  },

  /**
   * Start polling quota (every 10 seconds)
   */
  startPolling: () => {
    if (pollingInterval) {
      return; // Already polling
    }

    pollingInterval = setInterval(() => {
      get().checkQuota().catch((error) => {
        logger.error('Quota polling failed', { error: String(error) });
      });
    }, CONFIG.USAGE_TRACKING.SYNC_INTERVAL_MS);

    logger.debug('Usage polling started');
  },

  /**
   * Stop polling quota
   */
  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      logger.debug('Usage polling stopped');
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },
}));
