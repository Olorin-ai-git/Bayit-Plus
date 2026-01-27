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

// ============ AUDIOBOOK TYPES ============
// Complete audiobook types defined in web/src/types/audiobook.ts
// These are exported here for cross-platform access (web, mobile, tvOS)

export type AudioQuality = '8-bit' | '16-bit' | '24-bit' | '32-bit' | 'high-fidelity' | 'standard' | 'premium' | 'lossless'
export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'family'
export type VisibilityMode = 'public' | 'private' | 'restricted'

export interface Audiobook {
  id: string
  title: string
  author?: string
  narrator?: string
  description?: string
  duration?: string // Format: "HH:MM:SS"
  year?: number
  rating?: number
  thumbnail?: string
  backdrop?: string
  audio_quality?: AudioQuality
  isbn?: string
  book_edition?: string
  publisher_name?: string
  view_count: number
  avg_rating: number
  is_featured: boolean
  requires_subscription: SubscriptionTier
  content_format: 'audiobook'
  created_at: string
  updated_at: string
}

export interface AudiobookAdmin extends Audiobook {
  stream_url: string
  stream_type: 'hls' | 'dash' | 'rtmp' | 'rtmps'
  is_drm_protected: boolean
  drm_key_id?: string
  is_published: boolean
  visibility_mode: VisibilityMode
  section_ids: string[]
  primary_section_id?: string
  genre_ids: string[]
  audience_id?: string
  topic_tags: string[]
}

export interface AudiobookFilters {
  page?: number
  page_size?: number
  author?: string
  narrator?: string
  audio_quality?: AudioQuality
  requires_subscription?: SubscriptionTier
  is_published?: boolean
  search_query?: string
  genre_ids?: string[]
  sort_by?: 'title' | 'newest' | 'views' | 'rating'
  sort_order?: 'asc' | 'desc'
}
