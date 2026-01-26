/**
 * Multi-Window Store for tvOS
 * TV-specific multi-window state management adapted from mobile PiP pattern
 * Supports up to 4 concurrent windows with focus navigation and TV-optimized layouts
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Window types (adapted from mobile Widget)
export interface Window {
  id: string;
  type: 'system' | 'personal';
  user_id?: string;
  title: string;
  description?: string;
  icon?: string;
  content: WindowContent;
  position: WindowPosition;
  is_active: boolean;
  is_muted: boolean;
  is_visible: boolean;
  is_closable: boolean;
  is_draggable: boolean; // TV: Not applicable - kept for API compatibility
  visible_to_roles: string[];
  visible_to_subscription_tiers: string[];
  target_pages: string[];
  order: number;
  cover_url?: string;
  created_at: string;
  updated_at: string;
}

export interface WindowContent {
  content_type: 'live_channel' | 'live' | 'podcast' | 'vod' | 'radio' | 'iframe' | 'custom';
  channel_id?: string;
  podcast_id?: string;
  station_id?: string;
  vod_id?: string;
  iframe_url?: string;
  iframe_title?: string;
  component_name?: string;
}

export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
}

// TV-specific types (adapted from mobile PiP)
export type TVLayout = 'grid2x2' | 'sidebar3' | 'fullscreen';
export type FocusDirection = 'up' | 'down' | 'left' | 'right';
export type WindowState = 'full' | 'minimized' | 'expanded';

interface WindowLocalState {
  [windowId: string]: {
    isMuted: boolean;
    isVisible: boolean;
    position: WindowPosition;
    state: WindowState;
    // TV-specific: No drag/snap logic - removed isSnapped and snappedEdge
  };
}

interface MultiWindowStoreState {
  // Windows loaded from backend (compatible with /widgets/system, /widgets/personal/:userId)
  windows: Window[];
  isLoading: boolean;
  error: string | null;

  // Local state per window (persisted to AsyncStorage)
  localState: WindowLocalState;

  // TV-specific: Focus navigation state
  focusedWindowId: string | null;
  expandedWindowId: string | null;
  layoutMode: TVLayout;

  // TV-specific: Only one audio window active at a time (same as mobile)
  activeAudioWindow: string | null;

  // Actions - Data fetching
  setWindows: (windows: Window[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Window state
  toggleMute: (windowId: string) => void;
  closeWindow: (windowId: string) => void;
  showWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  expandWindow: (windowId: string) => void;
  updatePosition: (windowId: string, position: Partial<WindowPosition>) => void;

  // TV-specific: Focus and layout management
  setFocusedWindow: (windowId: string | null) => void;
  setLayoutMode: (layout: TVLayout) => void;
  navigateFocus: (direction: FocusDirection) => void;

  // Audio management (same as mobile - only one audio at a time)
  setActiveAudio: (windowId: string | null) => void;

  // Actions - CRUD
  addWindow: (window: Window) => void;
  removeWindow: (windowId: string) => void;
  updateWindow: (windowId: string, updates: Partial<Window>) => void;

  // Selectors
  getWindowState: (windowId: string) => any;
  getVisibleWindows: () => Window[];
  getMaxWindows: () => number;
  canAddWindow: () => boolean;
}

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

        // Preserve cover_url from existing windows
        const windowsWithPreservedData = newWindows.map((window) => {
          const existing = currentWindows.find((w) => w.id === window.id);
          if (existing?.cover_url && !window.cover_url) {
            return { ...window, cover_url: existing.cover_url };
          }
          return window;
        });

        // Initialize local state for new windows
        windowsWithPreservedData.forEach((window) => {
          if (!newLocalState[window.id]) {
            newLocalState[window.id] = {
              isMuted: window.is_muted,
              isVisible: window.is_visible,
              position: window.position,
              state: 'full',
              // TV: No drag/snap state needed
            };
          }
        });

        set({ windows: windowsWithPreservedData, localState: newLocalState, error: null });
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      toggleMute: (windowId) => {
        const { localState } = get();
        const windowState = localState[windowId];
        if (windowState) {
          set({
            localState: {
              ...localState,
              [windowId]: {
                ...windowState,
                isMuted: !windowState.isMuted,
              },
            },
          });
        }
      },

      closeWindow: (windowId) => {
        const { localState, activeAudioWindow, focusedWindowId, expandedWindowId } = get();
        const windowState = localState[windowId];

        // Clear active audio if closing that window
        const newActiveAudio = activeAudioWindow === windowId ? null : activeAudioWindow;

        // TV: Clear focus if closing focused window
        const newFocusedWindow = focusedWindowId === windowId ? null : focusedWindowId;

        // TV: Clear expanded state if closing expanded window
        const newExpandedWindow = expandedWindowId === windowId ? null : expandedWindowId;

        if (windowState) {
          set({
            localState: {
              ...localState,
              [windowId]: {
                ...windowState,
                isVisible: false,
              },
            },
            activeAudioWindow: newActiveAudio,
            focusedWindowId: newFocusedWindow,
            expandedWindowId: newExpandedWindow,
          });
        }
      },

      showWindow: (windowId) => {
        const { localState } = get();
        const windowState = localState[windowId];
        if (windowState) {
          set({
            localState: {
              ...localState,
              [windowId]: {
                ...windowState,
                isVisible: true,
              },
            },
          });
        }
      },

      minimizeWindow: (windowId) => {
        const { localState, expandedWindowId } = get();
        const windowState = localState[windowId];

        // TV: Clear expanded state if minimizing expanded window
        const newExpandedWindow = expandedWindowId === windowId ? null : expandedWindowId;

        if (windowState) {
          set({
            localState: {
              ...localState,
              [windowId]: {
                ...windowState,
                state: 'minimized',
              },
            },
            expandedWindowId: newExpandedWindow,
          });
        }
      },

      expandWindow: (windowId) => {
        const { localState } = get();
        const windowState = localState[windowId];
        if (windowState) {
          set({
            localState: {
              ...localState,
              [windowId]: {
                ...windowState,
                state: 'expanded',
              },
            },
            // TV: Track which window is expanded
            expandedWindowId: windowId,
          });
        }
      },

      updatePosition: (windowId, position) => {
        const { localState } = get();
        const windowState = localState[windowId];
        if (windowState) {
          set({
            localState: {
              ...localState,
              [windowId]: {
                ...windowState,
                position: {
                  ...windowState.position,
                  ...position,
                },
              },
            },
          });
        }
      },

      // TV-specific: Focus management
      setFocusedWindow: (windowId) => {
        set({ focusedWindowId: windowId });
      },

      // TV-specific: Layout mode switching
      setLayoutMode: (layout) => {
        set({ layoutMode: layout });
      },

      // TV-specific: Focus navigation (directional remote control)
      navigateFocus: (direction) => {
        const { focusedWindowId, windows, localState } = get();
        const visibleWindows = windows.filter((w) => {
          const state = localState[w.id];
          return w.is_active && (state?.isVisible ?? w.is_visible);
        });

        if (visibleWindows.length === 0) return;

        // If no focused window, focus the first visible one
        if (!focusedWindowId) {
          set({ focusedWindowId: visibleWindows[0].id });
          return;
        }

        const currentIndex = visibleWindows.findIndex((w) => w.id === focusedWindowId);
        if (currentIndex === -1) {
          set({ focusedWindowId: visibleWindows[0].id });
          return;
        }

        // Calculate next focus based on direction and current layout
        let nextIndex = currentIndex;
        const layout = get().layoutMode;

        if (layout === 'grid2x2') {
          // 2x2 grid navigation
          const cols = 2;
          const row = Math.floor(currentIndex / cols);
          const col = currentIndex % cols;

          switch (direction) {
            case 'up':
              if (row > 0) nextIndex = currentIndex - cols;
              break;
            case 'down':
              if (row < Math.floor((visibleWindows.length - 1) / cols)) nextIndex = currentIndex + cols;
              break;
            case 'left':
              if (col > 0) nextIndex = currentIndex - 1;
              break;
            case 'right':
              if (col < cols - 1 && currentIndex + 1 < visibleWindows.length) nextIndex = currentIndex + 1;
              break;
          }
        } else if (layout === 'sidebar3') {
          // Sidebar layout: 1 large + 3 sidebar items
          // Simple linear navigation for now
          switch (direction) {
            case 'up':
            case 'left':
              nextIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
              break;
            case 'down':
            case 'right':
              nextIndex = currentIndex < visibleWindows.length - 1 ? currentIndex + 1 : currentIndex;
              break;
          }
        } else if (layout === 'fullscreen') {
          // Fullscreen: only one window visible, no navigation
          return;
        }

        if (nextIndex !== currentIndex && visibleWindows[nextIndex]) {
          set({ focusedWindowId: visibleWindows[nextIndex].id });
        }
      },

      setActiveAudio: (windowId) => {
        set({ activeAudioWindow: windowId });
      },

      addWindow: (window) => {
        const { windows, localState } = get();
        set({
          windows: [...windows, window],
          localState: {
            ...localState,
            [window.id]: {
              isMuted: window.is_muted,
              isVisible: window.is_visible,
              position: window.position,
              state: 'full',
              // TV: No drag/snap state
            },
          },
        });
      },

      removeWindow: (windowId) => {
        const { windows, localState, activeAudioWindow, focusedWindowId, expandedWindowId } = get();
        const { [windowId]: removed, ...restState } = localState;

        // Clear all references to removed window
        const newActiveAudio = activeAudioWindow === windowId ? null : activeAudioWindow;
        const newFocusedWindow = focusedWindowId === windowId ? null : focusedWindowId;
        const newExpandedWindow = expandedWindowId === windowId ? null : expandedWindowId;

        set({
          windows: windows.filter((w) => w.id !== windowId),
          localState: restState,
          activeAudioWindow: newActiveAudio,
          focusedWindowId: newFocusedWindow,
          expandedWindowId: newExpandedWindow,
        });
      },

      updateWindow: (windowId, updates) => {
        const { windows } = get();
        set({
          windows: windows.map((w) => (w.id === windowId ? { ...w, ...updates } : w)),
        });
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
          // TV: No drag/snap state
        };
      },

      getVisibleWindows: () => {
        const { windows, localState } = get();
        return windows.filter((window) => {
          const state = localState[window.id];
          const isVisible = state?.isVisible ?? window.is_visible;
          return window.is_active && isVisible;
        });
      },

      // TV-specific: Max concurrent windows (4 vs mobile's 2)
      getMaxWindows: () => 4,

      canAddWindow: () => {
        const visibleWindows = get().getVisibleWindows();
        return visibleWindows.length < get().getMaxWindows();
      },
    }),
    {
      name: 'bayit-tv-multiwindow-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist local state, layout preferences, not the windows array (that comes from API)
      partialize: (state) => ({
        localState: state.localState,
        activeAudioWindow: state.activeAudioWindow,
        layoutMode: state.layoutMode,
        // Don't persist focusedWindowId or expandedWindowId - ephemeral per session
      }),
    }
  )
);

// Helper hook to get a single window with its merged state
export function useWindow(windowId: string) {
  const window = useMultiWindowStore((state) =>
    state.windows.find((w) => w.id === windowId)
  );
  const windowState = useMultiWindowStore((state) => state.getWindowState(windowId));
  const toggleMute = useMultiWindowStore((state) => state.toggleMute);
  const closeWindow = useMultiWindowStore((state) => state.closeWindow);
  const minimizeWindow = useMultiWindowStore((state) => state.minimizeWindow);
  const expandWindow = useMultiWindowStore((state) => state.expandWindow);
  const updatePosition = useMultiWindowStore((state) => state.updatePosition);
  const setFocusedWindow = useMultiWindowStore((state) => state.setFocusedWindow);
  const isFocused = useMultiWindowStore((state) => state.focusedWindowId === windowId);
  const isExpanded = useMultiWindowStore((state) => state.expandedWindowId === windowId);

  if (!window || !windowState) return null;

  return {
    window,
    ...windowState,
    isFocused,
    isExpanded,
    toggleMute: () => toggleMute(windowId),
    close: () => closeWindow(windowId),
    minimize: () => minimizeWindow(windowId),
    expand: () => expandWindow(windowId),
    updatePosition: (pos: Partial<WindowPosition>) => updatePosition(windowId, pos),
    setFocused: () => setFocusedWindow(windowId),
  };
}

export default useMultiWindowStore;
