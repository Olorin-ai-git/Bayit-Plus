/**
 * Beta Credits Global Store
 *
 * Centralized state management for Beta 500 credit balance.
 * Prevents redundant API calls by using single polling mechanism.
 *
 * Features:
 * - Single source of truth for credit balance
 * - Optimistic updates for instant UI feedback
 * - Adaptive polling (only when user is active)
 * - Pre-authorization checks before expensive operations
 */

import React from 'react';
import { create } from 'zustand';

interface BetaCreditsState {
  // State
  balance: number;
  isBetaUser: boolean;
  isLoading: boolean;
  lastUpdated: number;
  isActive: boolean;
  error: string | null;
  pollingInterval: NodeJS.Timeout | null;

  // Actions
  fetchBalance: (userId: string) => Promise<void>;
  deductCredits: (amount: number) => void;
  authorize: (estimatedCost: number) => Promise<boolean>;
  startPolling: (userId: string, intervalMs?: number) => void;
  stopPolling: () => void;
  reset: () => void;
}

const POLLING_INTERVAL_MS = 30000; // 30 seconds (matches backend checkpoint interval)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const useBetaCreditsStore = create<BetaCreditsState>((set, get) => ({
  // Initial state
  balance: 0,
  isBetaUser: false,
  isLoading: false,
  lastUpdated: 0,
  isActive: false,
  error: null,
  pollingInterval: null,

  /**
   * Fetch current credit balance from API.
   * Updates store with latest balance and beta user status.
   */
  fetchBalance: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/v1/beta/credits/balance`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Please log in');
        }
        if (response.status === 404) {
          throw new Error('Beta credits not found');
        }
        throw new Error(`Failed to fetch credits: ${response.statusText}`);
      }

      const data = await response.json();

      set({
        balance: data.balance || 0,
        isBetaUser: data.is_beta_user || false,
        lastUpdated: Date.now(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch beta credits:', errorMessage);

      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  /**
   * Optimistic credit deduction for instant UI feedback.
   * Actual deduction happens on backend - this just updates UI immediately.
   *
   * @param amount - Number of credits to deduct (positive integer)
   */
  deductCredits: (amount: number) => {
    const currentBalance = get().balance;
    const newBalance = Math.max(0, currentBalance - amount);

    set({ balance: newBalance });

    // Note: Backend handles actual deduction via API endpoints
    // This is just optimistic UI update for responsiveness
  },

  /**
   * Pre-authorization check before expensive operations.
   * Calls backend /authorize endpoint to verify sufficient credits.
   *
   * @param estimatedCost - Estimated credit cost for operation
   * @returns true if authorized, false if insufficient credits
   */
  authorize: async (estimatedCost: number): Promise<boolean> => {
    const currentBalance = get().balance;

    // Client-side check (fast, no API call)
    if (currentBalance < estimatedCost) {
      return false;
    }

    // Server-side verification (authoritative)
    try {
      const response = await fetch(`${API_BASE_URL}/v1/beta/credits/authorize`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimated_cost: estimatedCost,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.authorized === true;
    } catch (error) {
      console.error('Authorization check failed:', error);
      return false;
    }
  },

  /**
   * Start polling for credit balance updates.
   * Only polls when user is active (has tab focused).
   *
   * @param userId - User ID to fetch credits for
   * @param intervalMs - Polling interval in milliseconds (default: 30s)
   */
  startPolling: (userId: string, intervalMs: number = POLLING_INTERVAL_MS) => {
    // Stop existing polling if any
    const existingInterval = get().pollingInterval;
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Fetch immediately
    get().fetchBalance(userId);

    // Start polling interval
    const interval = setInterval(() => {
      // Only poll if user is active (tab focused)
      if (!document.hidden) {
        get().fetchBalance(userId);
      }
    }, intervalMs);

    set({ isActive: true, pollingInterval: interval });

    // Stop polling when tab is closed/hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        get().stopPolling();
      } else {
        get().startPolling(userId, intervalMs);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  },

  /**
   * Stop polling for credit balance updates.
   * Clears interval and marks store as inactive.
   */
  stopPolling: () => {
    const interval = get().pollingInterval;
    if (interval) {
      clearInterval(interval);
    }

    set({ isActive: false, pollingInterval: null });
  },

  /**
   * Reset store to initial state.
   * Stops polling and clears all data.
   */
  reset: () => {
    get().stopPolling();

    set({
      balance: 0,
      isBetaUser: false,
      isLoading: false,
      lastUpdated: 0,
      isActive: false,
      error: null,
      pollingInterval: null,
    });
  },
}));

/**
 * Hook for components to access beta credits.
 * Automatically starts polling on mount and stops on unmount.
 *
 * @param userId - User ID (required for fetching credits)
 * @returns Beta credits state and actions
 */
export function useBetaCredits(userId: string | undefined) {
  const store = useBetaCreditsStore();

  // Start polling on mount if userId is available
  React.useEffect(() => {
    if (userId) {
      store.startPolling(userId);
    }

    // Cleanup: stop polling on unmount
    return () => {
      store.stopPolling();
    };
  }, [userId]);

  return store;
}
