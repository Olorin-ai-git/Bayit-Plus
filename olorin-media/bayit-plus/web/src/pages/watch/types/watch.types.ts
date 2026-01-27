/**
 * Watch Page Type Definitions
 */

export interface PlaylistItem {
  content_id: string;
  content_type: string;
  title: string;
  thumbnail?: string;
  duration_hint?: number;
  order: number;
}

export interface WatchPageProps {
  type?: 'vod' | 'live' | 'radio' | 'podcast';
}

export interface ContentData {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  cover?: string;
  logo?: string;
  year?: string;
  duration?: string;
  /** Duration in seconds (used for transcoded streams) */
  duration_hint?: number;
  rating?: string;
  genre?: string;
  episodeCount?: number;
  cast?: string[];
  episodes?: Episode[];
  schedule?: ScheduleItem[];
  related?: any[];
  artist?: string;
  author?: string;
  latestEpisode?: {
    audioUrl: string;
  };
}

export interface Episode {
  id: string;
  title: string;
  duration: string;
  audioUrl?: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
  isNow?: boolean;
}

export interface Chapter {
  time: number;
  title: string;
}

export interface LocationState {
  flowId?: string;
  flowName?: string;
  playlist?: PlaylistItem[];
  currentIndex?: number;
}

export type ContentType = 'vod' | 'live' | 'radio' | 'podcast';
