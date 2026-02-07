/**
 * Multi-Window Types for tvOS
 * Type definitions for TV-specific multi-window system
 */

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

export interface WindowLocalState {
  [windowId: string]: {
    isMuted: boolean;
    isVisible: boolean;
    position: WindowPosition;
    state: WindowState;
  };
}

export interface MultiWindowStoreState {
  windows: Window[];
  isLoading: boolean;
  error: string | null;
  localState: WindowLocalState;
  focusedWindowId: string | null;
  expandedWindowId: string | null;
  layoutMode: TVLayout;
  activeAudioWindow: string | null;

  setWindows: (windows: Window[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleMute: (windowId: string) => void;
  closeWindow: (windowId: string) => void;
  showWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  expandWindow: (windowId: string) => void;
  updatePosition: (windowId: string, position: Partial<WindowPosition>) => void;
  setFocusedWindow: (windowId: string | null) => void;
  setLayoutMode: (layout: TVLayout) => void;
  navigateFocus: (direction: FocusDirection) => void;
  setActiveAudio: (windowId: string | null) => void;
  addWindow: (window: Window) => void;
  removeWindow: (windowId: string) => void;
  updateWindow: (windowId: string, updates: Partial<Window>) => void;
  getWindowState: (windowId: string) => any;
  getVisibleWindows: () => Window[];
  getMaxWindows: () => number;
  canAddWindow: () => boolean;
}

/**
 * Calculate the next focus index based on direction and layout
 * Returns the new index, or currentIndex if no movement possible
 */
export function calculateNextFocusIndex(
  currentIndex: number,
  direction: FocusDirection,
  layout: TVLayout,
  totalItems: number,
): number {
  if (layout === 'fullscreen') return currentIndex;

  if (layout === 'grid2x2') {
    const cols = 2;
    const row = Math.floor(currentIndex / cols);
    const col = currentIndex % cols;
    switch (direction) {
      case 'up': return row > 0 ? currentIndex - cols : currentIndex;
      case 'down': return row < Math.floor((totalItems - 1) / cols) ? currentIndex + cols : currentIndex;
      case 'left': return col > 0 ? currentIndex - 1 : currentIndex;
      case 'right': return col < cols - 1 && currentIndex + 1 < totalItems ? currentIndex + 1 : currentIndex;
    }
  }

  if (layout === 'sidebar3') {
    switch (direction) {
      case 'up': case 'left':
        return currentIndex > 0 ? currentIndex - 1 : currentIndex;
      case 'down': case 'right':
        return currentIndex < totalItems - 1 ? currentIndex + 1 : currentIndex;
    }
  }

  return currentIndex;
}
