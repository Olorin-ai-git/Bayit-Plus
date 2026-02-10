import { create } from 'zustand';
import { apiPlaylistService } from '../services/api/playlistServices';
import type { PlaylistItem } from '../services/api/playlistServices';

interface PlaylistState {
  items: PlaylistItem[];
  isLoading: boolean;
  isVisible: boolean;
  error: string | null;

  fetchPlaylist: () => Promise<void>;
  addItem: (contentId: string, contentType: string) => Promise<void>;
  removeItem: (contentId: string) => Promise<void>;
  clearPlaylist: () => Promise<void>;
  reorderItem: (contentId: string, newPosition: number) => Promise<void>;
  toggleItem: (contentId: string, contentType?: string) => Promise<boolean>;
  isInPlaylist: (contentId: string) => boolean;
  setVisible: (visible: boolean) => void;
  setItems: (items: PlaylistItem[]) => void;
  clearError: () => void;
}

export const usePlaylistStore: import('zustand').UseBoundStore<import('zustand').StoreApi<PlaylistState>> = create<PlaylistState>((set) => ({
  items: [],
  isLoading: false,
  isVisible: false,
  error: null,

  fetchPlaylist: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiPlaylistService.getPlaylist();
      if (data && Array.isArray(data.items)) {
        set({ items: data.items, isLoading: false });
      } else if ((data as any)?.detail) {
        set({ error: (data as any).detail, items: [], isLoading: false });
      } else {
        set({ items: [], isLoading: false });
      }
    } catch (err: any) {
      set({
        error: err?.detail || err?.message || 'Failed to load playlist',
        isLoading: false,
      });
    }
  },

  addItem: async (contentId, contentType) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiPlaylistService.addItem(contentId, contentType);
      set({ items: data.items || [], isLoading: false });
    } catch (err: any) {
      set({
        error: err?.detail || err?.message || 'Failed to add item',
        isLoading: false,
      });
    }
  },

  removeItem: async (contentId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiPlaylistService.removeItem(contentId);
      set({ items: data.items || [], isLoading: false });
    } catch (err: any) {
      set({
        error: err?.detail || err?.message || 'Failed to remove item',
        isLoading: false,
      });
    }
  },

  clearPlaylist: async () => {
    set({ isLoading: true, error: null });
    try {
      await apiPlaylistService.clearPlaylist();
      set({ items: [], isLoading: false });
    } catch (err: any) {
      set({
        error: err?.detail || err?.message || 'Failed to clear playlist',
        isLoading: false,
      });
    }
  },

  reorderItem: async (contentId, newPosition) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiPlaylistService.reorderItem(contentId, newPosition);
      set({ items: data.items || [], isLoading: false });
    } catch (err: any) {
      set({
        error: err?.detail || err?.message || 'Failed to reorder item',
        isLoading: false,
      });
    }
  },

  toggleItem: async (contentId, contentType = 'vod') => {
    set({ error: null });
    try {
      const result = await apiPlaylistService.toggleItem(contentId, contentType);
      // Refresh the full playlist to stay in sync
      const data = await apiPlaylistService.getPlaylist();
      if (data && Array.isArray(data.items)) {
        set({ items: data.items });
      }
      return result.in_playlist;
    } catch (err: any) {
      set({
        error: err?.detail || err?.message || 'Failed to toggle item',
      });
      return false;
    }
  },

  isInPlaylist: (contentId) => {
    const { items } = usePlaylistStore.getState();
    return items.some((item: PlaylistItem) => item.content_id === contentId);
  },

  setVisible: (visible) => set({ isVisible: visible }),

  setItems: (items) => set({ items }),

  clearError: () => set({ error: null }),
}));

export default usePlaylistStore;
