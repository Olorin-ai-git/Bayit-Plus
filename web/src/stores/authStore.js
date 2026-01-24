import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/api'
import logger from '@/utils/logger'

// Create scoped logger for auth operations
const authLogger = logger.scope('Auth');

// Helper function to decode JWT and check expiration
const decodeToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    authLogger.error('Failed to decode token', error);
    return null;
  }
};

// Helper function to check if token will expire soon (within 5 minutes)
const willExpireSoon = (token) => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return expirationTime - now < fiveMinutes;
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isHydrated: false,
      refreshTimeout: null, // Store timeout ID for cleanup

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      // Refresh access token using refresh token
      refreshAccessToken: async () => {
        const { refreshToken, logout } = get();

        if (!refreshToken) {
          authLogger.warn('No refresh token available');
          logout();
          return false;
        }

        try {
          authLogger.info('Refreshing access token');
          const response = await authService.refreshToken(refreshToken);

          // Update state with new tokens
          set({
            token: response.access_token,
            refreshToken: response.refresh_token,
            user: response.user,
            isAuthenticated: true,
          });

          // Update localStorage immediately
          const authData = {
            state: {
              user: response.user,
              token: response.access_token,
              refreshToken: response.refresh_token,
              isAuthenticated: true,
            },
            version: 0,
          };
          localStorage.setItem('bayit-auth', JSON.stringify(authData));
          authLogger.info('Token refreshed successfully');

          // Schedule next refresh
          get().scheduleTokenRefresh();
          return true;
        } catch (error) {
          authLogger.error('Failed to refresh token', error);
          // Refresh failed - log out user
          logout();
          return false;
        }
      },

      // Schedule automatic token refresh before expiration
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

        // Refresh 5 minutes before expiration (or immediately if already expired)
        const refreshTime = Math.max(0, timeUntilExpiry - (5 * 60 * 1000));

        authLogger.info(`Scheduling token refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);

        const timeout = setTimeout(() => {
          get().refreshAccessToken();
        }, refreshTime);

        set({ refreshTimeout: timeout });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.login(email, password)

          // Update state
          set({
            user: response.user,
            token: response.token || response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          })

          // CRITICAL: Manually write to localStorage immediately to prevent race condition
          // This ensures the token is available before any API calls
          // Match zustand persist structure exactly
          const authData = {
            state: {
              user: response.user,
              token: response.token || response.access_token,
              refreshToken: response.refresh_token,
              isAuthenticated: true,
            },
            version: 0,
          }
          localStorage.setItem('bayit-auth', JSON.stringify(authData))
          authLogger.info('Login successful - Token saved to localStorage', {
            tokenPreview: (response.token || response.access_token)?.substring(0, 20) + '...'
          });

          // Schedule automatic token refresh
          get().scheduleTokenRefresh();

          return response
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.register(userData)

          // Update state
          set({
            user: response.user,
            token: response.token || response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          })

          // CRITICAL: Manually write to localStorage immediately to prevent race condition
          // This ensures the token is available before any API calls
          // Match zustand persist structure exactly
          const authData = {
            state: {
              user: response.user,
              token: response.token || response.access_token,
              refreshToken: response.refresh_token,
              isAuthenticated: true,
            },
            version: 0,
          }
          localStorage.setItem('bayit-auth', JSON.stringify(authData))
          authLogger.info('Registration successful - Token saved to localStorage', {
            tokenPreview: (response.token || response.access_token)?.substring(0, 20) + '...'
          });

          // Schedule automatic token refresh
          get().scheduleTokenRefresh();

          return response
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null })
        try {
          // Build redirect URI dynamically based on current origin
          const redirectUri = `${window.location.origin}/auth/google/callback`
          authLogger.info('Starting Google login', { redirectUri });
          const response = await authService.getGoogleAuthUrl(redirectUri)
          authLogger.info('Got Google auth URL, redirecting', { url: response.url });
          window.location.href = response.url
        } catch (error) {
          authLogger.error('Error getting Google auth URL', error);
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      handleGoogleCallback: async (code, state) => {
        authLogger.info('handleGoogleCallback called', {
          codePreview: code?.substring(0, 20),
          hasState: !!state
        });
        set({ isLoading: true, error: null })
        try {
          // Build redirect URI dynamically based on current origin
          const redirectUri = `${window.location.origin}/auth/google/callback`
          authLogger.info('Calling authService.googleCallback', { redirectUri });
          const response = await authService.googleCallback(code, redirectUri, state)
          authLogger.info('googleCallback response received', {
            hasUser: !!response?.user,
            hasToken: !!response?.access_token
          });

          // Update state
          set({
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          })

          // CRITICAL: Manually write to localStorage immediately to prevent race condition
          // This ensures the token is available before navigation happens
          // Match zustand persist structure exactly
          const authData = {
            state: {
              user: response.user,
              token: response.access_token,
              refreshToken: response.refresh_token,
              isAuthenticated: true,
            },
            version: 0,
          }
          localStorage.setItem('bayit-auth', JSON.stringify(authData))
          authLogger.info('Auth data saved to localStorage');

          // Schedule automatic token refresh
          get().scheduleTokenRefresh();

          return response
        } catch (error) {
          authLogger.error('handleGoogleCallback error', error);
          set({ error: error.message, isLoading: false })
          throw error
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
        })
      },

      updateProfile: async (updates) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.updateProfile(updates)
          set({ user: response.user, isLoading: false })
          return response
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      // RBAC helper - check if user has admin role
      isAdmin: () => {
        const { user } = get()
        if (!user) return false
        const adminRoles = ['super_admin', 'admin', 'content_manager', 'billing_admin', 'support']
        return adminRoles.includes(user.role)
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'bayit-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated after rehydration from localStorage
        if (state) {
          state.isHydrated = true;

          // Schedule token refresh if we have a valid token
          if (state.token && state.refreshToken) {
            // Check if token will expire soon
            if (willExpireSoon(state.token)) {
              authLogger.info('Token will expire soon, refreshing immediately');
              state.refreshAccessToken();
            } else {
              authLogger.info('Scheduling token refresh after rehydration');
              state.scheduleTokenRefresh();
            }
          }
        }
      },
    }
  )
)
