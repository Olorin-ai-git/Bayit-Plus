import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { authService } from '../services/api';
import { Role, Permission, ROLE_PERMISSIONS } from '../types/rbac';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  is_active: boolean;
  role: Role;
  permissions?: Permission[];  // Custom permission overrides
  subscription?: {
    plan: string;
    status: string;
    end_date?: string;
  };
  created_at?: string;
  last_login?: string;
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
  // Passkey session state
  passkeySessionToken: string | null;
  passkeySessionExpires: string | null;
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: () => Promise<string | void>;
  handleGoogleCallback: (code: string, state?: string) => Promise<any>;
  logout: () => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
  refreshAccessToken: () => Promise<boolean>;
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
      // Passkey session state
      passkeySessionToken: null,
      passkeySessionExpires: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: any = await authService.login(email, password);
          set({
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token || null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.detail || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response: any = await authService.register(data);
          set({
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token || null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.detail || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          // Get Google OAuth URL from backend
          const response: any = await authService.getGoogleAuthUrl();
          // For web, redirect to Google OAuth URL
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.href = response.url;
          }
          // For native apps, return the URL (caller handles deep linking)
          return response.url;
        } catch (error: any) {
          set({
            error: error.detail || 'Google login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      handleGoogleCallback: async (code: string, state?: string) => {
        set({ isLoading: true, error: null });
        try {
          // Pass redirect_uri to match what was sent to Google
          const redirectUri = Platform.OS === 'web' && typeof window !== 'undefined'
            ? `${window.location.origin}/auth/google/callback`
            : undefined;
          const response: any = await authService.googleCallback(code, redirectUri, state);
          set({
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token || null,
            isAuthenticated: true,
            isLoading: false,
          });
          return response;
        } catch (error: any) {
          set({
            error: error.detail || 'Google login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          passkeySessionToken: null,
          passkeySessionExpires: null,
        });
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      clearError: () => set({ error: null }),

      // Refresh access token using refresh token
      refreshAccessToken: async () => {
        const { refreshToken, logout } = get();

        if (!refreshToken) {
          console.warn('[AuthStore] No refresh token available');
          return false;
        }

        try {
          const response: any = await authService.refreshToken(refreshToken);

          // Update state with new tokens
          set({
            token: response.access_token,
            refreshToken: response.refresh_token || refreshToken,
            user: response.user || get().user,
            isAuthenticated: true,
          });

          return true;
        } catch (error) {
          console.error('[AuthStore] Failed to refresh token', error);
          // Refresh failed - log out user
          logout();
          return false;
        }
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
        // Check if session has expired
        const expiresDate = new Date(passkeySessionExpires);
        return expiresDate > new Date();
      },

      // RBAC helper implementations
      getPermissions: () => {
        const { user } = get();
        if (!user) return [];
        // Get base permissions from role
        const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
        // Merge with custom permissions if any
        const customPermissions = user.permissions || [];
        // Return unique permissions
        return [...new Set([...rolePermissions, ...customPermissions])];
      },

      hasPermission: (permission: Permission) => {
        const permissions = get().getPermissions();
        return permissions.includes(permission);
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
        // Admins are always verified
        if (get().isAdminRole()) return true;
        // Check if user has is_verified field (new field)
        return (user as any).is_verified === true;
      },

      needsVerification: () => {
        const { user } = get();
        if (!user) return false;
        // Admins don't need verification
        if (get().isAdminRole()) return false;
        // Regular users need verification
        return !get().isVerified();
      },

      canWatchVOD: () => {
        const { user } = get();
        if (!user) return false;
        // Admins always can
        if (get().isAdminRole()) return true;
        // Regular users need verification AND subscription
        return get().isVerified() && !!user.subscription?.plan;
      },

      canCreateWidgets: () => {
        const { user } = get();
        if (!user) return false;
        // Admins always can
        if (get().isAdminRole()) return true;
        // Regular users need verification AND premium/family subscription
        const premiumPlans = ['premium', 'family'];
        return get().isVerified() && premiumPlans.includes(user.subscription?.plan || '');
      },

      isPremium: () => {
        const { user } = get();
        if (!user) return false;
        // Admins are always considered premium
        if (get().isAdminRole()) return true;
        // Check for premium or family subscription
        const premiumPlans = ['premium', 'family'];
        return get().isVerified() && premiumPlans.includes(user.subscription?.plan || '');
      },
    }),
    {
      name: 'bayit-auth',
      storage: createJSONStorage(() => AsyncStorage),
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
          // Data integrity check: if authenticated but no user, reset auth state
          if (state.isAuthenticated && !state.user) {
            console.warn('[AuthStore] Data integrity issue: authenticated but no user. Resetting auth state.');
            state.isAuthenticated = false;
            state.token = null;
            state.passkeySessionToken = null;
            state.passkeySessionExpires = null;
          }
          state.isHydrated = true;
        }
      },
    }
  )
);
