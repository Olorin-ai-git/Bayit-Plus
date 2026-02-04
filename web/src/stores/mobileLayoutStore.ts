/**
 * Mobile Layout Store
 *
 * Zustand store for managing mobile-specific layout state including
 * sidebar drawer visibility and bottom navigation tab selection.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MobileLayoutState {
  /** Sidebar drawer open state (mobile only) */
  isSidebarOpen: boolean;
  /** Current active tab in bottom navigation */
  currentTab: string;
  /** Toggle sidebar drawer visibility */
  toggleSidebar: () => void;
  /** Open sidebar drawer */
  openSidebar: () => void;
  /** Close sidebar drawer */
  closeSidebar: () => void;
  /** Set current active tab */
  setCurrentTab: (tab: string) => void;
}

export const useMobileLayoutStore = create<MobileLayoutState>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      currentTab: 'home',

      toggleSidebar: () =>
        set((state) => ({
          isSidebarOpen: !state.isSidebarOpen,
        })),

      openSidebar: () =>
        set({ isSidebarOpen: true }),

      closeSidebar: () =>
        set({ isSidebarOpen: false }),

      setCurrentTab: (tab: string) =>
        set({ currentTab: tab }),
    }),
    {
      name: 'bayit-mobile-layout',
      // Only persist current tab, not sidebar state
      partialize: (state) => ({
        currentTab: state.currentTab,
      }),
    }
  )
);
