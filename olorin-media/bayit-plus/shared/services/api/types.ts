/**
 * API Types - TypeScript interfaces for API requests and responses
 */

// Search Filters
export interface SearchFilters {
  type?: 'all' | 'movies' | 'series' | 'channels' | 'radio' | 'podcasts';
  language?: string;
  limit?: number;
}

// Search Result Types
export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'movie' | 'series' | 'channel' | 'radio' | 'podcast';
  thumbnail?: string;
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

export interface LLMSearchResponse {
  results: SearchResult[];
  query: string;
  interpretation?: string;
  suggestions?: string[];
  total: number;
}

// Voice Preferences Types
export type VoiceLanguage = 'he' | 'en' | 'es' | 'zh' | 'fr' | 'it' | 'hi' | 'ta' | 'bn' | 'ja';
export type TextSize = 'small' | 'medium' | 'large';
export type VADSensitivity = 'low' | 'medium' | 'high';

export interface VoicePreferences {
  voice_search_enabled: boolean;
  auto_subtitle: boolean;
  high_contrast_mode: boolean;
  text_size: TextSize;
  hold_button_mode: boolean;
  silence_threshold_ms: number;
  vad_sensitivity: VADSensitivity;
  wake_word_enabled: boolean;
  wake_word: string;
  wake_word_sensitivity: number;
  wake_word_cooldown_ms: number;
  voice_mode: string;
  voice_feedback_enabled: boolean;
  tts_enabled: boolean;
  tts_voice_id: string;
  tts_speed: number;
  tts_volume: number;
}

// Home Page Configuration Types
export interface HomeSectionConfigAPI {
  id: string;
  labelKey: string;
  visible: boolean;
  order: number;
  icon: string;
}

export interface HomePagePreferencesAPI {
  sections: HomeSectionConfigAPI[];
}

// Resolved content item from resolve-content API
export interface ResolvedContentItem {
  id: string;
  name: string;
  type: string;
  thumbnail?: string;
  stream_url?: string;
  matched_name: string;
  confidence: number;
}

export interface ResolveContentResponse {
  items: ResolvedContentItem[];
  unresolved: Array<{ name: string; type: string }>;
  total_requested: number;
  total_resolved: number;
}

// Downloads Types
export interface Download {
  id: string;
  content_id: string;
  content_type: string;
  title?: string;
  title_en?: string;
  title_es?: string;
  thumbnail?: string;
  quality: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  file_size?: number;
  downloaded_at: string;
}

export interface DownloadAdd {
  content_id: string;
  content_type: string;
  quality?: string;
}
