/**
 * B2B Authentication Store
 *
 * Zustand store for B2B partner authentication state management.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  B2BUser,
  B2BOrganization,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '../types';
import { getB2BApiUrl } from '../config/env';
import { getApiClient, setAuthHandlers } from '../services/api';

const AUTH_STORAGE_KEY = 'b2b_auth_state';

interface B2BAuthState {
  user: B2BUser | null;
  organization: B2BOrganization | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  hydrateFromStorage: () => void;
}

export const useB2BAuthStore = create<B2BAuthState>()(
  persist(
    (set, get) => {
      // Initialize auth handlers after store is created
      const initializeAuthHandlers = () => {
        setAuthHandlers(
          () => get().accessToken,
          () => get().refreshAccessToken(),
          () => get().logout()
        );
      };

      // Call initialization
      setTimeout(initializeAuthHandlers, 0);

      return {
        user: null,
        organization: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,

        login: async (credentials: LoginRequest) => {
          set({ isLoading: true, error: null });

          try {
            const client = getApiClient();
            const response = await client.post<LoginResponse>(
              getB2BApiUrl('/auth/login'),
              credentials
            );

            const { accessToken, refreshToken, user, organization } = response.data;

            set({
              user,
              organization,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Login failed';
            set({
              isLoading: false,
              error: message,
              isAuthenticated: false,
            });
            throw error;
          }
        },

        register: async (data: RegisterRequest) => {
          set({ isLoading: true, error: null });

          try {
            const client = getApiClient();
            const response = await client.post<LoginResponse>(
              getB2BApiUrl('/auth/register'),
              data
            );

            const { accessToken, refreshToken, user, organization } = response.data;

            set({
              user,
              organization,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Registration failed';
            set({
              isLoading: false,
              error: message,
              isAuthenticated: false,
            });
            throw error;
          }
        },

        logout: async () => {
          const { accessToken } = get();

          try {
            if (accessToken) {
              const client = getApiClient();
              await client.post(getB2BApiUrl('/auth/logout'));
            }
          } catch {
            // Ignore logout errors - clear state anyway
          } finally {
            set({
              user: null,
              organization: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        },

        refreshAccessToken: async () => {
          const { refreshToken } = get();

          if (!refreshToken) {
            await get().logout();
            throw new Error('No refresh token available');
          }

          try {
            const client = getApiClient();
            const response = await client.post<{ accessToken: string; refreshToken: string }>(
              getB2BApiUrl('/auth/refresh'),
              { refreshToken }
            );

            set({
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
            });
          } catch (error) {
            await get().logout();
            throw error;
          }
        },

        fetchCurrentUser: async () => {
          const { accessToken } = get();

          if (!accessToken) {
            set({ isLoading: false });
            return;
          }

          set({ isLoading: true });

          try {
            const client = getApiClient();
            const response = await client.get<{ user: B2BUser; organization: B2BOrganization }>(
              getB2BApiUrl('/auth/me')
            );

            set({
              user: response.data.user,
              organization: response.data.organization,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch {
            // Token might be expired, try to refresh
            try {
              await get().refreshAccessToken();
              await get().fetchCurrentUser();
            } catch {
              await get().logout();
            }
          }
        },

        clearError: () => set({ error: null }),

        setLoading: (loading: boolean) => set({ isLoading: loading }),

        hydrateFromStorage: () => {
          const { accessToken, refreshToken } = get();
          if (accessToken && refreshToken) {
            get().fetchCurrentUser();
          } else {
            set({ isLoading: false });
          }
        },
      };
    },
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        organization: state.organization,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrateFromStorage();
        }
      },
    }
  )
);
