/**
 * Authentication Migration Utilities
 * 
 * Utilities to help migrate authentication components from root repository
 * to the centralized auth submodule with backward compatibility
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Auth Module
  */

/**
 * Legacy AuthContext type mapping for backward compatibility
 * Maps root repository interfaces to auth submodule interfaces
  */
export interface LegacyAuthContextType {
  user: any;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  hasCalendarPermissions: boolean;
  requestCalendarPermissions: () => Promise<void>;
  premium: {
    isPremium: boolean;
    isLifetimePremium: boolean;
    subscription: any;
    features: {
      webPortal: boolean;
      aiChat: boolean;
      podcast: boolean;
      advancedAnalytics: boolean;
    };
    subscriptionStatus: 'free' | 'premium_lifetime';
    isLoadingPremium: boolean;
    premiumError: string | null;
    refreshPremiumStatus: () => Promise<void>;
    hasFeature: (feature: string) => boolean;
    clearPremiumError: () => void;
  };
}

/**
 * Migration wrapper for root repository components
 * Provides backward compatibility while transitioning to auth submodule
  */
export const createLegacyAuthWrapper = (authModule: any): LegacyAuthContextType => {
  return {
    user: authModule.user,
    loading: authModule.isLoading,
    error: authModule.error,
    signInWithGoogle: authModule.signInWithGoogle || (() => Promise.reject(new Error('Google OAuth not implemented'))),
    signIn: async (email: string, password: string) => {
      await authModule.signIn(email, password);
    },
    signUp: async (email: string, password: string) => {
      await authModule.signUp(email, password);
    },
    signOut: authModule.signOut,
    clearError: authModule.clearError,
    hasCalendarPermissions: authModule.hasCalendarPermissions || false,
    requestCalendarPermissions: authModule.requestCalendarPermissions || (() => Promise.resolve()),
    premium: {
      isPremium: authModule.isPremium || false,
      isLifetimePremium: authModule.isPremium || false,
      subscription: authModule.premiumFeatures,
      features: {
        webPortal: authModule.hasPremiumFeature?.('webPortal') || false,
        aiChat: authModule.hasPremiumFeature?.('aiChat') || false,
        podcast: authModule.hasPremiumFeature?.('podcast') || false,
        advancedAnalytics: authModule.hasPremiumFeature?.('advancedAnalytics') || false
      },
      subscriptionStatus: authModule.isPremium ? 'premium_lifetime' : 'free',
      isLoadingPremium: authModule.isLoadingPremium || false,
      premiumError: authModule.premiumError || null,
      refreshPremiumStatus: authModule.refreshPremiumStatus || (() => Promise.resolve()),
      hasFeature: (feature: string) => authModule.hasPremiumFeature?.(feature) || false,
      clearPremiumError: () => authModule.clearError?.()
    }
  };
};

/**
 * Import mapping for components being migrated
 * Maps old import paths to new auth submodule exports
  */
export const importMappings = {
  // Context imports
  'contexts/AuthContext': '@cvplus/auth',
  '../contexts/AuthContext': '@cvplus/auth', 
  '../../contexts/AuthContext': '@cvplus/auth',
  
  // Service imports  
  'services/authService': '@cvplus/auth',
  '../services/authService': '@cvplus/auth',
  '../../services/authService': '@cvplus/auth',
  
  // Component imports
  'components/AuthGuard': '@cvplus/auth',
  '../components/AuthGuard': '@cvplus/auth', 
  '../../components/AuthGuard': '@cvplus/auth',
  
  'components/SignInDialog': '@cvplus/auth',
  '../components/SignInDialog': '@cvplus/auth',
  '../../components/SignInDialog': '@cvplus/auth',
  
  // Middleware imports (backend)
  'middleware/authGuard': '@cvplus/auth',
  '../middleware/authGuard': '@cvplus/auth',
  '../../middleware/authGuard': '@cvplus/auth'
};

/**
 * Component export mappings for migrated components
 * Maps old component names to new auth submodule exports
  */
export const componentMappings = {
  // Root repository exports -> Auth submodule exports
  'useAuth': 'useAuth',
  'usePremium': 'usePremium', 
  'useFeature': 'usePremium', // Maps to enhanced usePremium
  'usePremiumUpgrade': 'usePremium', // Maps to enhanced usePremium
  'AuthContext': 'AuthProvider',
  'AuthProvider': 'AuthProvider',
  'AuthGuard': 'AuthGuard',
  'SignInDialog': 'SignInDialog',
  
  // Backend middleware mappings
  'requireAuth': 'requireAuth',
  'requireAdmin': 'requireAdmin',
  'AuthenticatedRequest': 'AuthenticatedRequest'
};

/**
 * Migration checklist for components
  */
export const migrationChecklist = {
  frontend: [
    'Update import path: contexts/AuthContext -> @cvplus/auth',
    'Update import path: services/authService -> @cvplus/auth', 
    'Update import path: components/AuthGuard -> @cvplus/auth',
    'Update import path: components/SignInDialog -> @cvplus/auth',
    'Update useAuth hook usage (some methods may have changed)',
    'Update usePremium hook usage for enhanced features',
    'Test Google OAuth and calendar integration',
    'Verify premium status caching works correctly',
    'Test authentication state persistence across tabs'
  ],
  backend: [
    'Update import path: middleware/authGuard -> @cvplus/auth',
    'Replace requireAuth calls with new middleware',
    'Replace requireAdmin calls with new middleware', 
    'Update AuthenticatedRequest type usage',
    'Test Firebase Functions with new auth middleware',
    'Verify rate limiting functionality',
    'Test admin authentication flows',
    'Validate email verification enforcement'
  ],
  testing: [
    'Test all authentication flows (email, Google OAuth)',
    'Verify premium feature access control',
    'Test admin authentication and permissions',
    'Validate session management and persistence',
    'Test cross-tab authentication synchronization',
    'Verify calendar permissions integration',
    'Test authentication error handling',
    'Validate rate limiting behavior'
  ]
};

export default {
  createLegacyAuthWrapper,
  importMappings,
  componentMappings,
  migrationChecklist
};