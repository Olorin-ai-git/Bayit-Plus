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
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: () => Promise<string | void>;
  handleGoogleCallback: (code: string) => Promise<any>;
  logout: () => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
  // RBAC helpers
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isAdmin: () => boolean;
  getPermissions: () => Permission[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: any = await authService.login(email, password);
          set({
            user: response.user,
            token: response.access_token,
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

      handleGoogleCallback: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: any = await authService.googleCallback(code);
          set({
            user: response.user,
            token: response.access_token,
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
          isAuthenticated: false,
          error: null,
        });
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      clearError: () => set({ error: null }),

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
    }),
    {
      name: 'bayit-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
