/**
 * B2B Auth Store
 *
 * Zustand store for B2B partner authentication state.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  B2BUser,
  B2BOrganization,
  LoginRequest,
  RegisterRequest,
} from '../types';
import * as authService from '../services/authService';
import { setAuthHandlers } from '../services/b2bApiClient';

const STORAGE_KEY = 'b2b_auth_state';

interface B2BAuthState {
  user: B2BUser | null;
  organization: B2BOrganization | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (isLoading: boolean) => void;
}

const initialState = {
  user: null,
  organization: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useB2BAuthStore = create<B2BAuthState>()(
  persist(
    (set, get) => {
      const store: B2BAuthState = {
        ...initialState,

        login: async (credentials: LoginRequest) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authService.login(credentials);
            set({
              user: response.user,
              organization: response.organization,
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Login failed';
            set({ error: message, isLoading: false });
            throw error;
          }
        },

        register: async (data: RegisterRequest) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authService.register(data);
            set({
              user: response.user,
              organization: response.organization,
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Registration failed';
            set({ error: message, isLoading: false });
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true });
          try {
            await authService.logout();
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            set(initialState);
          }
        },

        refreshAccessToken: async () => {
          const { refreshToken } = get();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          try {
            const response = await authService.refreshToken(refreshToken);
            set({ accessToken: response.accessToken });
          } catch (error) {
            set(initialState);
            throw error;
          }
        },

        fetchCurrentUser: async () => {
          set({ isLoading: true });
          try {
            const user = await authService.getCurrentUser();
            set({ user, isLoading: false });
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },

        clearError: () => set({ error: null }),

        setLoading: (isLoading: boolean) => set({ isLoading }),
      };

      setAuthHandlers(
        () => get().accessToken,
        () => get().refreshAccessToken(),
        () => {
          set(initialState);
        }
      );

      return store;
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const useIsAuthenticated = () =>
  useB2BAuthStore((state) => state.isAuthenticated);

export const useCurrentUser = () => useB2BAuthStore((state) => state.user);

export const useCurrentOrganization = () =>
  useB2BAuthStore((state) => state.organization);

export const useAuthLoading = () => useB2BAuthStore((state) => state.isLoading);

export const useAuthError = () => useB2BAuthStore((state) => state.error);
