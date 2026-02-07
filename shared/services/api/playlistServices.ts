/**
 * Playlist Services - Playlist API endpoints
 *
 * Ordered playback queue management (add, remove, clear, reorder).
 */

import { api } from './client';

export interface PlaylistItem {
  content_id: string;
  content_type: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  position: number;
  added_at: string;
}

export interface PlaylistResponse {
  items: PlaylistItem[];
  item_count: number;
  message: string;
}

export const apiPlaylistService = {
  getPlaylist: (): Promise<PlaylistResponse> =>
    api.get('/playlist'),

  addItem: (contentId: string, contentType: string): Promise<PlaylistResponse> =>
    api.post('/playlist/items', {
      content_id: contentId,
      content_type: contentType,
    }),

  removeItem: (contentId: string): Promise<PlaylistResponse> =>
    api.delete(`/playlist/items/${contentId}`),

  clearPlaylist: (): Promise<PlaylistResponse> =>
    api.delete('/playlist'),

  reorderItem: (contentId: string, newPosition: number): Promise<PlaylistResponse> =>
    api.put('/playlist/items/reorder', {
      content_id: contentId,
      new_position: newPosition,
    }),
};
