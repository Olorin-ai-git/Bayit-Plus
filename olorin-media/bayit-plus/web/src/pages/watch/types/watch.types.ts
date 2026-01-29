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
  /** URL for web content (articles, events) to display in iframe */
  url?: string;
  /** Video URL for playback (YouTube, direct video, etc.) - takes priority over url */
  video_url?: string;
  /** Content type (article, event, vod, etc.) */
  type?: string;
  /** Content format (article, event, movie, video, etc.) */
  content_format?: string;
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
  contentData?: ContentData;  // Full content data passed from ContentCard (for scraped articles/events)
}

export type ContentType = 'vod' | 'live' | 'radio' | 'podcast';
