/**
 * Playlist Page Helpers
 * Shared utility functions for playlist page components
 */

import type { PlaylistPageItem } from './types';

export const getTypeIconName = (type: string): string => {
  switch (type) {
    case 'movie': return 'vod';
    case 'series': return 'vod';
    case 'podcast': return 'podcasts';
    case 'radio': return 'radio';
    case 'live':
    case 'channel': return 'live';
    default: return 'discover';
  }
};

export const getWatchRoute = (item: PlaylistPageItem): string => {
  switch (item.type) {
    case 'live':
    case 'channel': return `/live/${item.id}`;
    case 'podcast': return `/podcasts/${item.id}`;
    case 'radio': return `/radio/${item.id}`;
    default: return `/vod/${item.id}`;
  }
};

export const getFlowContentType = (type: string): string => {
  switch (type) {
    case 'podcast': return 'podcast';
    case 'radio': return 'radio';
    case 'live':
    case 'channel': return 'live';
    default: return 'vod';
  }
};
