/**
 * Playlist Playback Store
 * Manages sequential "Play All" playback state for watchlist/playlist.
 * Tracks which item is currently playing and provides navigation to next/previous.
 *
 * This store is platform-agnostic - the actual player integration
 * (e.g., fullscreen player open/close) is handled by platform-specific consumers.
 */

import { create } from 'zustand';
import { logger } from '../utils/logger';

const log = logger.scope('PlaylistPlayback');

export interface PlaylistPlaybackItem {
  id: string;
  title: string;
  thumbnail?: string;
  type: string;
  duration?: string;
}

interface PlaylistPlaybackState {
  /** Whether sequential "Play All" mode is active */
  isPlayAllActive: boolean;
  /** Content ID of the item currently being played */
  currentPlayingId: string | null;
  /** Ordered list of items for sequential playback */
  playbackQueue: PlaylistPlaybackItem[];
  /** Current index in the playback queue */
  currentIndex: number;

  /**
   * Begin sequential playback from the first item.
   * Returns the first item so the caller can open the player.
   */
  startPlayAll: (items: PlaylistPlaybackItem[]) => PlaylistPlaybackItem | null;

  /**
   * Advance to the next item in the queue.
   * Returns the next item, or null if playback has ended.
   */
  playNext: () => PlaylistPlaybackItem | null;

  /** Stop sequential playback and reset state */
  stopPlayAll: () => void;
}

export const usePlaylistPlaybackStore = create<PlaylistPlaybackState>((set, get) => ({
  isPlayAllActive: false,
  currentPlayingId: null,
  playbackQueue: [],
  currentIndex: 0,

  startPlayAll: (items) => {
    if (items.length === 0) {
      log.warn('startPlayAll called with empty items list');
      return null;
    }

    const firstItem = items[0];

    log.info('Starting Play All', {
      totalItems: items.length,
      firstItemId: firstItem.id,
      firstItemTitle: firstItem.title,
    });

    set({
      isPlayAllActive: true,
      playbackQueue: items,
      currentIndex: 0,
      currentPlayingId: firstItem.id,
    });

    return firstItem;
  },

  playNext: () => {
    const { playbackQueue, currentIndex, isPlayAllActive } = get();

    if (!isPlayAllActive) {
      log.debug('playNext called but Play All is not active');
      return null;
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= playbackQueue.length) {
      log.info('Reached end of playlist, stopping Play All', {
        totalPlayed: playbackQueue.length,
      });
      get().stopPlayAll();
      return null;
    }

    const nextItem = playbackQueue[nextIndex];

    log.info('Advancing to next item', {
      nextIndex,
      nextItemId: nextItem.id,
      nextItemTitle: nextItem.title,
      remaining: playbackQueue.length - nextIndex - 1,
    });

    set({
      currentIndex: nextIndex,
      currentPlayingId: nextItem.id,
    });

    return nextItem;
  },

  stopPlayAll: () => {
    const { isPlayAllActive } = get();

    if (isPlayAllActive) {
      log.info('Stopping Play All');
    }

    set({
      isPlayAllActive: false,
      currentPlayingId: null,
      playbackQueue: [],
      currentIndex: 0,
    });
  },
}));
