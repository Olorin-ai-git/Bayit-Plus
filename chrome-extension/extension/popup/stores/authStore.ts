/**
 * Authentication Store
 *
 * Manages user authentication state using Zustand
 */

import { create } from 'zustand';
import type { User } from '../../background/auth-manager';
import {
  getToken,
  getCurrentUser,
  isAuthenticated,
  isPremiumUser,
  refreshUserInfo,
  onAuthStateChanged,
} from '../../background/auth-manager';
import { logger } from '../../lib/logger';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/**
 * Authentication store
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isPremium: false,
  isLoading: true,
  error: null,

  /**
   * Initialize authentication state
   */
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      const authenticated = await isAuthenticated();
      if (!authenticated) {
        set({
          user: null,
          isAuthenticated: false,
          isPremium: false,
          isLoading: false,
        });
        return;
      }

      const user = await getCurrentUser();
      const premium = await isPremiumUser();

      set({
        user,
        isAuthenticated: true,
        isPremium: premium,
        isLoading: false,
      });

      logger.info('Auth state initialized', {
        authenticated: true,
        userId: user?.id,
        tier: user?.subscription_tier,
      });

      // Listen for auth state changes
      onAuthStateChanged(async (authenticated) => {
        if (!authenticated) {
          set({
            user: null,
            isAuthenticated: false,
            isPremium: false,
          });
        } else {
          await get().refresh();
        }
      });
    } catch (error) {
      logger.error('Failed to initialize auth state', { error: String(error) });
      set({
        error: String(error),
        isLoading: false,
      });
    }
  },

  /**
   * Refresh user info from backend
   */
  refresh: async () => {
    try {
      await refreshUserInfo();

      const user = await getCurrentUser();
      const premium = await isPremiumUser();

      set({
        user,
        isPremium: premium,
        error: null,
      });

      logger.debug('User info refreshed', {
        userId: user?.id,
        tier: user?.subscription_tier,
      });
    } catch (error) {
      logger.error('Failed to refresh user info', { error: String(error) });
      set({ error: String(error) });
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      const { clearToken } = await import('../../background/auth-manager');
      await clearToken();

      set({
        user: null,
        isAuthenticated: false,
        isPremium: false,
        error: null,
      });

      logger.info('User logged out');
    } catch (error) {
      logger.error('Failed to logout', { error: String(error) });
      set({ error: String(error) });
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },
}));
