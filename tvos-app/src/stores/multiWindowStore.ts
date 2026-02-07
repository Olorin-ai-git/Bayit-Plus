/**
 * Multi-Window Store for tvOS
 * TV-specific multi-window state management adapted from mobile PiP pattern
 * Supports up to 4 concurrent windows with focus navigation and TV-optimized layouts
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MultiWindowStoreState } from '../types/multiWindow';
import { calculateNextFocusIndex } from '../types/multiWindow';

// Re-export types for backward compatibility
export type { Window, WindowContent, WindowPosition, TVLayout, FocusDirection, WindowState } from '../types/multiWindow';

export const useMultiWindowStore = create<MultiWindowStoreState>()(
  persist(
    (set, get) => ({
      windows: [],
      isLoading: false,
      error: null,
      localState: {},
      focusedWindowId: null,
      expandedWindowId: null,
      layoutMode: 'grid2x2',
      activeAudioWindow: null,

      setWindows: (newWindows) => {
        const currentState = get().localState;
        const currentWindows = get().windows;
        const newLocalState = { ...currentState };
        const windowsWithPreservedData = newWindows.map((window) => {
          const existing = currentWindows.find((w) => w.id === window.id);
          return existing?.cover_url && !window.cover_url ? { ...window, cover_url: existing.cover_url } : window;
        });
        windowsWithPreservedData.forEach((window) => {
          if (!newLocalState[window.id]) {
            newLocalState[window.id] = {
              isMuted: window.is_muted, isVisible: window.is_visible, position: window.position, state: 'full',
            };
          }
        });
        set({ windows: windowsWithPreservedData, localState: newLocalState, error: null });
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      toggleMute: (windowId) => {
        const { localState } = get();
        const ws = localState[windowId];
        if (ws) set({ localState: { ...localState, [windowId]: { ...ws, isMuted: !ws.isMuted } } });
      },

      closeWindow: (windowId) => {
        const { localState, activeAudioWindow, focusedWindowId, expandedWindowId } = get();
        const ws = localState[windowId];
        if (ws) {
          set({
            localState: { ...localState, [windowId]: { ...ws, isVisible: false } },
            activeAudioWindow: activeAudioWindow === windowId ? null : activeAudioWindow,
            focusedWindowId: focusedWindowId === windowId ? null : focusedWindowId,
            expandedWindowId: expandedWindowId === windowId ? null : expandedWindowId,
          });
        }
      },

      showWindow: (windowId) => {
        const { localState } = get();
        const ws = localState[windowId];
        if (ws) set({ localState: { ...localState, [windowId]: { ...ws, isVisible: true } } });
      },

      minimizeWindow: (windowId) => {
        const { localState, expandedWindowId } = get();
        const ws = localState[windowId];
        if (ws) {
          set({
            localState: { ...localState, [windowId]: { ...ws, state: 'minimized' } },
            expandedWindowId: expandedWindowId === windowId ? null : expandedWindowId,
          });
        }
      },

      expandWindow: (windowId) => {
        const { localState } = get();
        const ws = localState[windowId];
        if (ws) {
          set({
            localState: { ...localState, [windowId]: { ...ws, state: 'expanded' } },
            expandedWindowId: windowId,
          });
        }
      },

      updatePosition: (windowId, position) => {
        const { localState } = get();
        const ws = localState[windowId];
        if (ws) {
          set({ localState: { ...localState, [windowId]: { ...ws, position: { ...ws.position, ...position } } } });
        }
      },

      setFocusedWindow: (windowId) => set({ focusedWindowId: windowId }),
      setLayoutMode: (layout) => set({ layoutMode: layout }),

      navigateFocus: (direction) => {
        const { focusedWindowId, windows, localState } = get();
        const visibleWindows = windows.filter((w) => {
          const state = localState[w.id];
          return w.is_active && (state?.isVisible ?? w.is_visible);
        });
        if (visibleWindows.length === 0) return;
        if (!focusedWindowId) { set({ focusedWindowId: visibleWindows[0].id }); return; }
        const currentIndex = visibleWindows.findIndex((w) => w.id === focusedWindowId);
        if (currentIndex === -1) { set({ focusedWindowId: visibleWindows[0].id }); return; }
        const nextIndex = calculateNextFocusIndex(currentIndex, direction, get().layoutMode, visibleWindows.length);
        if (nextIndex !== currentIndex && visibleWindows[nextIndex]) {
          set({ focusedWindowId: visibleWindows[nextIndex].id });
        }
      },

      setActiveAudio: (windowId) => set({ activeAudioWindow: windowId }),

      addWindow: (window) => {
        const { windows, localState } = get();
        set({
          windows: [...windows, window],
          localState: {
            ...localState,
            [window.id]: { isMuted: window.is_muted, isVisible: window.is_visible, position: window.position, state: 'full' },
          },
        });
      },

      removeWindow: (windowId) => {
        const { windows, localState, activeAudioWindow, focusedWindowId, expandedWindowId } = get();
        const { [windowId]: removed, ...restState } = localState;
        set({
          windows: windows.filter((w) => w.id !== windowId),
          localState: restState,
          activeAudioWindow: activeAudioWindow === windowId ? null : activeAudioWindow,
          focusedWindowId: focusedWindowId === windowId ? null : focusedWindowId,
          expandedWindowId: expandedWindowId === windowId ? null : expandedWindowId,
        });
      },

      updateWindow: (windowId, updates) => {
        set({ windows: get().windows.map((w) => (w.id === windowId ? { ...w, ...updates } : w)) });
      },

      getWindowState: (windowId) => {
        const { localState, windows } = get();
        const window = windows.find((w) => w.id === windowId);
        const state = localState[windowId];
        if (!window) return null;
        return {
          isMuted: state?.isMuted ?? window.is_muted,
          isVisible: state?.isVisible ?? window.is_visible,
          position: state?.position ?? window.position,
          state: state?.state ?? 'full',
        };
      },

      getVisibleWindows: () => {
        const { windows, localState } = get();
        return windows.filter((w) => {
          const state = localState[w.id];
          return w.is_active && (state?.isVisible ?? w.is_visible);
        });
      },

      getMaxWindows: () => 4,
      canAddWindow: () => get().getVisibleWindows().length < get().getMaxWindows(),
    }),
    {
      name: 'bayit-tv-multiwindow-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        localState: state.localState,
        activeAudioWindow: state.activeAudioWindow,
        layoutMode: state.layoutMode,
      }),
    }
  )
);

export default useMultiWindowStore;
