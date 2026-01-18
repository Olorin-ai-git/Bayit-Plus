export interface Season {
  season_number: number;
  episode_count: number;
  first_episode_id?: string;
  first_episode_thumbnail?: string;
}

export interface Episode {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  episode_number: number;
  duration?: string;
  preview_url?: string;
  stream_url?: string;
  progress?: number;
}

export interface SeriesData {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  category?: string;
  year?: number;
  rating?: string;
  genre?: string;
  cast?: string[];
  director?: string;
  total_seasons: number;
  total_episodes: number;
  trailer_url?: string;
  preview_url?: string;
  seasons: Season[];
  related: any[];
}
