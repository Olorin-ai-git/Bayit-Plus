/**
 * DEMO-ONLY: This file contains type definitions for demo mode data.
 * Not used in production - demo data is for testing/demonstration purposes only.
 */

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  profile_image: string | null;
  subscription: {
    plan: string;
    status: string;
    expires_at: string;
  };
  preferences: {
    language: string;
    subtitles_enabled: boolean;
    nikud_enabled: boolean;
    tap_translate_enabled: boolean;
    show_israel_time: boolean;
    shabbat_mode_enabled: boolean;
    local_timezone: string;
    morning_ritual_enabled: boolean;
    morning_ritual_start: number;
    morning_ritual_end: number;
    morning_ritual_content: string[];
    layout_tv: string;
  };
  created_at: string;
}

export interface ContentItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description: string;
  description_en?: string;
  description_es?: string;
  type: string;
  genre: string;
  year: number;
  duration: number;
  rating: string;
  thumbnail: string;
  backdrop?: string;
  stream_url: string;
  seasons?: number;
  episodes?: number;
}

export interface LiveChannel {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  logo: string;
  stream_url: string;
  category: string;
  epg_id: string;
  current_program?: string;
  current_program_en?: string;
  current_program_es?: string;
  is_hd: boolean;
}

export interface RadioStation {
  id: string;
  name: string;
  logo: string;
  stream_url: string;
  genre: string;
  description: string;
  current_show?: string;
}

export interface Podcast {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  host: string;
  host_en?: string;
  host_es?: string;
  description: string;
  description_en?: string;
  description_es?: string;
  thumbnail: string;
  category: string;
  episodes: PodcastEpisode[];
}

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  duration: number;
  published_at: string;
  audio_url: string;
}

export interface TrendingTopic {
  id: string;
  title: string;
  title_en?: string;
  source: string;
  category: string;
  sentiment: string;
  trend_score: number;
  related_content: string[];
  summary: string;
  summary_en?: string;
}
