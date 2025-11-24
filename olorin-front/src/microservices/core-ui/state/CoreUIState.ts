/**
 * Core UI State Management
 *
 * State management for Core UI Service including authentication,
 * theme, navigation, and notifications.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../../shared/types/core/user.types';
import type { Notification } from '../../shared/types/core/notification.types';

export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  customizations: Record<string, any>;
}

export interface NavigationState {
  currentPath: string;
  previousPath: string | null;
  breadcrumbs: Array<{ label: string; path: string }>;
}

export interface CoreUIState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  authToken: string | null;

  // Theme
  theme: ThemeConfig;

  // Navigation
  navigation: NavigationState;

  // Notifications
  notifications: Notification[];
}

export interface CoreUIActions {
  // Authentication actions
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;

  // Theme actions
  setTheme: (theme: Partial<ThemeConfig>) => void;
  toggleThemeMode: () => void;

  // Navigation actions
  navigate: (path: string) => void;
  updateBreadcrumbs: (breadcrumbs: Array<{ label: string; path: string }>) => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const initialState: CoreUIState = {
  user: null,
  isAuthenticated: false,
  authToken: null,
  theme: {
    mode: 'dark',
    primaryColor: '#A855F7',
    customizations: {}
  },
  navigation: {
    currentPath: '/',
    previousPath: null,
    breadcrumbs: []
  },
  notifications: []
};

/**
 * Core UI Zustand Store
 */
export const useCoreUIStore = create<CoreUIState & CoreUIActions>()(
  persist(
    (set) => ({
      ...initialState,

      // Authentication actions
      login: (user, token) =>
        set({
          user,
          authToken: token,
          isAuthenticated: true
        }),

      logout: () =>
        set({
          user: null,
          authToken: null,
          isAuthenticated: false
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null
        })),

      // Theme actions
      setTheme: (themeUpdates) =>
        set((state) => ({
          theme: { ...state.theme, ...themeUpdates }
        })),

      toggleThemeMode: () =>
        set((state) => ({
          theme: {
            ...state.theme,
            mode: state.theme.mode === 'dark' ? 'light' : 'dark'
          }
        })),

      // Navigation actions
      navigate: (path) =>
        set((state) => ({
          navigation: {
            ...state.navigation,
            previousPath: state.navigation.currentPath,
            currentPath: path
          }
        })),

      updateBreadcrumbs: (breadcrumbs) =>
        set((state) => ({
          navigation: {
            ...state.navigation,
            breadcrumbs
          }
        })),

      // Notification actions
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id: `notification-${Date.now()}` }
          ]
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id)
        })),

      clearNotifications: () =>
        set({ notifications: [] })
    }),
    {
      name: 'core-ui-storage',
      partialState: (state) => ({
        user: state.user,
        authToken: state.authToken,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme
      })
    }
  )
);
