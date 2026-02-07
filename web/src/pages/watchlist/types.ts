/**
 * Playlist Page Type Definitions
 */

export interface PlaylistPageItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'live' | 'podcast' | 'radio' | 'channel';
  category?: string;
  is_kids_content?: boolean;
  year?: string;
  duration?: string;
  addedAt?: string;
  progress?: number;
}
