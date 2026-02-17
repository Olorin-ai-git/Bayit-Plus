/**
 * Watch History Store - Manages watch progress and continue watching state.
 *
 * Tracks playback progress, continue watching items, and sync across platforms.
 */

import { create } from 'zustand';
import { apiHistoryService } from '../services/api/userServices';
import type { WatchProgress, ContinueWatchingItem } from '../types/vod';
import logger from '../utils/logger';

const historyLogger = logger.scope('WatchHistoryStore');

interface WatchHistoryState {
  continueWatching: ContinueWatchingItem[];
  progressMap: Record<string, WatchProgress>;
  isLoading: boolean;
  error: string | null;

  fetchContinueWatching: () => Promise<void>;
  updateProgress: (
    contentId: string,
    contentType: string,
    position: number,
    duration: number,
  ) => Promise<void>;
  getProgress: (contentId: string) => WatchProgress | undefined;
  clearError: () => void;
}

export const useWatchHistoryStore = create<WatchHistoryState>((set, get) => ({
  continueWatching: [],
  progressMap: {},
  isLoading: false,
  error: null,

  fetchContinueWatching: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiHistoryService.getContinueWatching();
      const items: ContinueWatchingItem[] = Array.isArray(data) ? data : data?.items || [];

      // Build progress map from continue watching items
      const progressMap: Record<string, WatchProgress> = {};
      for (const item of items) {
        if (item.progress?.content_id) {
          progressMap[item.progress.content_id] = item.progress;
        }
      }

      set({ continueWatching: items, progressMap, isLoading: false });
    } catch (err: any) {
      historyLogger.error('Failed to fetch continue watching', { error: err });
      set({
        error: err?.detail || err?.message || 'Failed to load watch history',
        isLoading: false,
      });
    }
  },

  updateProgress: async (contentId, contentType, position, duration) => {
    try {
      await apiHistoryService.updateProgress(contentId, contentType, position, duration);

      // Update local progress map optimistically
      const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
      const completed = progressPercent >= 95;

      set((state) => ({
        progressMap: {
          ...state.progressMap,
          [contentId]: {
            id: contentId,
            user_id: '',
            content_id: contentId,
            progress_seconds: position,
            duration_seconds: duration,
            progress_percent: progressPercent,
            completed,
            last_watched: new Date().toISOString(),
          },
        },
      }));
    } catch (err: any) {
      historyLogger.error('Failed to update progress', { error: err, contentId });
    }
  },

  getProgress: (contentId: string) => {
    return get().progressMap[contentId];
  },

  clearError: () => set({ error: null }),
}));

export default useWatchHistoryStore;
