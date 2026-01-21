/**
 * Auth Module Integration
 *
 * Uses legacy AuthContext system
 */

import {
  useAuth,
  usePremium,
  useFeature,
  usePremiumUpgrade,
  AuthProvider,
  type AuthContextType,
  type PremiumContextType
} from '../contexts/AuthContext';

// Export auth system
export {
  useAuth,
  usePremium,
  useFeature,
  usePremiumUpgrade,
  AuthProvider,
  type AuthContextType,
  type PremiumContextType
};

// Migration helper functions
export const authMigrationHelpers = {
  isLegacyAuth: () => true,
  canUseNewAuth: () => false,
  shouldFallback: (error: Error) => {
    logger.warn('Auth module error, falling back to legacy:', error);
    return true;
  },
  getCurrentAuthSystem: () => 'legacy'
};
