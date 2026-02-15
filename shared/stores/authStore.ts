/**
 * Unified Auth Store - Single Source of Truth
 * Works across web, iOS, Android, and tvOS platforms
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '../services/api';
import { Role, Permission, ROLE_PERMISSIONS } from '../types/rbac';
import { getPlatformStorage, isWebPlatform } from '../utils/storage';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  is_active: boolean;
  role: Role;
  permissions?: Permission[];
  subscription?: {
    plan: string;
    status: string;
    end_date?: string;
  };
  created_at?: string;
  last_login?: string;
  is_verified?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  pending_plan_id?: string;
  payment_pending?: boolean;
  token?: string;
  [key: string]: any;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
  refreshTimeout: ReturnType<typeof setTimeout> | null;
  // Passkey session state
  passkeySessionToken: string | null;
  passkeySessionExpires: string | null;
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: (redirectUri?: string) => Promise<string | void>;
  handleGoogleCallback: (code: string, state?: string) => Promise<any>;
  logout: () => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
  refreshAccessToken: () => Promise<boolean>;
  scheduleTokenRefresh: () => void;
  // Passkey session actions
  setPasskeySession: (token: string, expiresAt: string) => void;
  clearPasskeySession: () => void;
  hasPasskeyAccess: () => boolean;
  // RBAC helpers
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isAdmin: () => boolean;
  getPermissions: () => Permission[];
  // Verification helpers
  isAdminRole: () => boolean;
  isVerified: () => boolean;
  needsVerification: () => boolean;
  canWatchVOD: () => boolean;
  canCreateWidgets: () => boolean;
  isPremium: () => boolean;
}

// Helper function to decode JWT and check expiration
const decodeToken = (token: string): { exp?: number } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
};

// Check if token will expire within 5 minutes
const willExpireSoon = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  const expirationTime = payload.exp * 1000;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return expirationTime - now < fiveMinutes;
};

// Get redirect URI for current platform
const getRedirectUri = (): string | undefined => {
  if (isWebPlatform() && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/google/callback`;
  }
  return undefined;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isHydrated: false,
      refreshTimeout: null,
      // Passkey session state
      passkeySessionToken: null,
      passkeySessionExpires: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: any = await authService.login(email, password);
          const token = response.token || response.access_token;

          set({
            user: response.user,
            token,
            refreshToken: response.refresh_token || null,
            isAuthenticated: true,
            isLoading: false,
          });

          // Schedule token refresh
          get().scheduleTokenRefresh();
        } catch (error: any) {
          set({
            error: error.detail || error.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response: any = await authService.register(data);
          const token = response.token || response.access_token;

          set({
            user: response.user,
            token,
            refreshToken: response.refresh_token || null,
            isAuthenticated: true,
            isLoading: false,
          });

          // Schedule token refresh
          get().scheduleTokenRefresh();
        } catch (error: any) {
          set({
            error: error.detail || error.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      loginWithGoogle: async (redirectUri?: string) => {
        set({ isLoading: true, error: null });
        try {
          const uri = redirectUri || getRedirectUri();
          const response: any = await authService.getGoogleAuthUrl(uri);

          // For web, redirect to Google OAuth URL
          if (isWebPlatform() && typeof window !== 'undefined') {
            window.location.href = response.url;
            return;
          }

          // For native apps, return the URL (caller handles deep linking)
          return response.url;
        } catch (error: any) {
          set({
            error: error.detail || error.message || 'Google login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      handleGoogleCallback: async (code: string, state?: string) => {
        set({ isLoading: true, error: null });
        try {
          const redirectUri = getRedirectUri();
          const response: any = await authService.googleCallback(code, redirectUri, state);

          set({
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token || null,
            isAuthenticated: true,
            isLoading: false,
          });

          // Schedule token refresh
          get().scheduleTokenRefresh();
          return response;
        } catch (error: any) {
          set({
            error: error.detail || error.message || 'Google login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        const { refreshTimeout } = get();

        // Clear refresh timeout
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          refreshTimeout: null,
          passkeySessionToken: null,
          passkeySessionExpires: null,
        });
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      clearError: () => set({ error: null }),

      refreshAccessToken: async () => {
        const { refreshToken, logout } = get();

        if (!refreshToken) {
          logout();
          return false;
        }

        try {
          const response: any = await authService.refreshToken(refreshToken);

          set({
            token: response.access_token,
            refreshToken: response.refresh_token || refreshToken,
            user: response.user || get().user,
            isAuthenticated: true,
          });

          // Schedule next refresh
          get().scheduleTokenRefresh();
          return true;
        } catch {
          logout();
          return false;
        }
      },

      scheduleTokenRefresh: () => {
        const { token, refreshToken, refreshTimeout } = get();

        // Clear any existing timeout
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }

        if (!token || !refreshToken) {
          return;
        }

        const payload = decodeToken(token);
        if (!payload || !payload.exp) {
          return;
        }

        // Calculate time until token expires
        const expirationTime = payload.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expirationTime - now;

        // Refresh 5 minutes before expiration
        const refreshTime = Math.max(0, timeUntilExpiry - (5 * 60 * 1000));

        const timeout = setTimeout(() => {
          get().refreshAccessToken();
        }, refreshTime);

        set({ refreshTimeout: timeout });
      },

      // Passkey session actions
      setPasskeySession: (token: string, expiresAt: string) => {
        set({
          passkeySessionToken: token,
          passkeySessionExpires: expiresAt,
        });
      },

      clearPasskeySession: () => {
        set({
          passkeySessionToken: null,
          passkeySessionExpires: null,
        });
      },

      hasPasskeyAccess: () => {
        const { passkeySessionToken, passkeySessionExpires } = get();
        if (!passkeySessionToken || !passkeySessionExpires) {
          return false;
        }
        const expiresDate = new Date(passkeySessionExpires);
        return expiresDate > new Date();
      },

      // RBAC helpers
      getPermissions: () => {
        const { user } = get();
        if (!user) return [];
        const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
        const customPermissions = user.permissions || [];
        return [...new Set([...rolePermissions, ...customPermissions])];
      },

      hasPermission: (permission: Permission) => {
        return get().getPermissions().includes(permission);
      },

      hasAnyPermission: (permissions: Permission[]) => {
        const userPermissions = get().getPermissions();
        return permissions.some(p => userPermissions.includes(p));
      },

      hasAllPermissions: (permissions: Permission[]) => {
        const userPermissions = get().getPermissions();
        return permissions.every(p => userPermissions.includes(p));
      },

      isAdmin: () => {
        const { user } = get();
        if (!user) return false;
        const adminRoles: Role[] = ['super_admin', 'admin', 'content_manager', 'billing_admin', 'support'];
        return adminRoles.includes(user.role);
      },

      // Verification helpers
      isAdminRole: () => {
        const { user } = get();
        if (!user) return false;
        const adminRoles: Role[] = ['super_admin', 'admin', 'content_manager', 'billing_admin', 'support'];
        return adminRoles.includes(user.role);
      },

      isVerified: () => {
        const { user } = get();
        if (!user) return false;
        if (get().isAdminRole()) return true;
        return user.is_verified === true;
      },

      needsVerification: () => {
        const { user } = get();
        if (!user) return false;
        if (get().isAdminRole()) return false;
        return !get().isVerified();
      },

      canWatchVOD: () => {
        const { user } = get();
        if (!user) return false;
        if (get().isAdminRole()) return true;
        return get().isVerified() && !!user.subscription?.plan;
      },

      canCreateWidgets: () => {
        const { user } = get();
        if (!user) return false;
        if (get().isAdminRole()) return true;
        const premiumPlans = ['premium', 'family'];
        return get().isVerified() && premiumPlans.includes(user.subscription?.plan || '');
      },

      isPremium: () => {
        const { user } = get();
        if (!user) return false;
        if (get().isAdminRole()) return true;
        const premiumPlans = ['premium', 'family'];
        return get().isVerified() && premiumPlans.includes(user.subscription?.plan || '');
      },
    }),
    {
      name: 'bayit-auth',
      storage: createJSONStorage(() => getPlatformStorage()),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        passkeySessionToken: state.passkeySessionToken,
        passkeySessionExpires: state.passkeySessionExpires,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Data integrity check
          if (state.isAuthenticated && !state.user) {
            state.isAuthenticated = false;
            state.token = null;
            state.passkeySessionToken = null;
            state.passkeySessionExpires = null;
          }

          state.isHydrated = true;

          // Schedule token refresh if needed
          if (state.token && state.refreshToken) {
            if (willExpireSoon(state.token)) {
              state.refreshAccessToken();
            } else {
              state.scheduleTokenRefresh();
            }
          }

          // Add page visibility listener (web only)
          if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            const handleVisibilityChange = () => {
              if (!document.hidden && state.token && state.refreshToken) {
                // User returned to tab - check if token needs refresh
                try {
                  const payload = JSON.parse(atob(state.token.split('.')[1]));
                  if (payload && payload.exp) {
                    const expiresIn = (payload.exp * 1000) - Date.now();
                    const tenMinutes = 10 * 60 * 1000;

                    // Refresh if expires within 10 minutes
                    if (expiresIn < tenMinutes && expiresIn > 0) {
                      state.refreshAccessToken();
                    }
                  }
                } catch (error) {
                  // Silent fail - don't break on invalid token format
                }
              }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);
          }
        }
      },
    }
  )
);
