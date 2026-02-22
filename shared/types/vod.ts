/**
 * VOD Types - TypeScript interfaces for VOD content, player, and related models.
 * Aligned with backend Content model (app/models/content.py).
 */

// ============ CONTENT FORMAT ============

export type ContentFormat =
  | "movie"
  | "series"
  | "documentary"
  | "short"
  | "clip";

// ============ CONTENT RATING ============

export type ContentRating =
  | "G"
  | "PG"
  | "PG-13"
  | "R"
  | "NC-17"
  | "TV-Y"
  | "TV-G"
  | "TV-PG"
  | "TV-14"
  | "TV-MA";

// ============ AUDIENCE ============

export type AudienceId = "general" | "kids" | "family" | "mature";

// ============ QUALITY TIER ============

export type QualityTier = "480p" | "720p" | "1080p" | "4k";

// ============ STREAM TYPE ============

export type StreamType = "hls" | "dash";

// ============ DRM TYPE ============

export type DRMType = "widevine" | "fairplay";

// ============ SUBSCRIPTION TIER ============

export type SubscriptionTier = "none" | "basic" | "premium" | "family";

// ============ AUDIO TRACK ============

export interface AudioTrack {
  language: string;
  label: string;
  url?: string;
  is_dubbed: boolean;
  is_ai_dubbed: boolean;
  is_default: boolean;
}

// ============ QUALITY VARIANT ============

export interface QualityVariant {
  content_id: string;
  quality_tier: QualityTier;
  resolution_height: number;
  stream_url: string;
}

// ============ DRM CONFIG ============

export interface DRMConfig {
  type: DRMType;
  license_url: string;
  certificate_url?: string;
}

// ============ STREAM MANIFEST ============

export interface StreamManifest {
  content_id: string;
  title: string;
  stream_url: string;
  stream_type: StreamType;
  duration_seconds?: number;
  audio_tracks: AudioTrack[];
  subtitle_languages: string[];
  drm_config?: DRMConfig;
  cdn_config?: {
    base_url: string;
    token_header: string;
  };
  quality_variants: QualityVariant[];
  token?: string;
}

// ============ CAST MEMBER ============

export interface CastMember {
  name: string;
  role?: string;
  character?: string;
  profile_image?: string;
}

// ============ EPISODE ============

export interface Episode {
  id: string;
  episode_number: number;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  duration_minutes?: number;
  stream_url: string;
  thumbnail_url?: string;
  air_date?: string;
}

// ============ SEASON ============

export interface Season {
  season_number: number;
  title?: string;
  episode_count: number;
  episodes: Episode[];
}

// ============ VOD CONTENT ITEM ============

export interface VODContentItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  thumbnail?: string;
  backdrop?: string;
  poster_url?: string;

  // Classification
  content_format?: ContentFormat;
  section_ids: string[];
  primary_section_id?: string;
  audience_id?: AudienceId;
  genre_ids: string[];
  topic_tags: string[];

  // Legacy fields (backward compatibility)
  category_id?: string;
  category_name?: string;
  genre?: string;
  content_type?: string;

  // Metadata
  duration?: string;
  year?: number;
  rating?: string | number;
  content_rating?: ContentRating;
  cast?: string[];
  director?: string;

  // Streaming
  stream_url: string;
  stream_type: StreamType;
  is_drm_protected: boolean;
  quality_tier?: QualityTier;
  quality_variants: QualityVariant[];

  // Series info
  season?: number;
  episode?: number;
  series_id?: string;
  total_seasons?: number;
  total_episodes?: number;

  // Subtitles and audio
  has_subtitles: boolean;
  available_subtitle_languages: string[];

  // External IDs
  tmdb_id?: number;
  imdb_id?: string;
  imdb_rating?: number;

  // Visibility
  is_published: boolean;
  is_featured: boolean;
  requires_subscription: SubscriptionTier;

  // Kids/age
  is_kids_content: boolean;
  age_rating?: number;

  // Analytics
  view_count: number;
  avg_rating: number;

  // Trailer
  trailer_url?: string;
  trailer_stream_url?: string;

  // Interactive
  supports_avatar_interaction: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============ VOD CATEGORY ============

export interface VODCategory {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  slug?: string;
  items: VODContentItem[];
  total?: number;
}

// ============ VOD COLLECTION ============

export type CollectionType =
  | "curated"
  | "genre"
  | "trending"
  | "new_releases"
  | "continue_watching"
  | "recommended"
  | "seasonal"
  | "ai_generated";

export interface VODCollection {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  collection_type: CollectionType;
  cover_image?: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  ai_prompt?: string;
  ai_generated_at?: string;
  rotation_interval_hours?: number;
  items: VODCollectionItem[];
}

export interface VODCollectionItem {
  content_id: string;
  position: number;
  added_at: string;
}

// ============ WATCH PROGRESS ============

export interface WatchProgress {
  id: string;
  user_id: string;
  content_id: string;
  progress_seconds: number;
  duration_seconds: number;
  progress_percent: number;
  completed: boolean;
  last_watched: string;
  episode_number?: number;
  season_number?: number;
}

// ============ CONTINUE WATCHING ITEM ============

export interface ContinueWatchingItem {
  content: VODContentItem;
  progress: WatchProgress;
}

// ============ FAVORITE ============

export interface FavoriteStatus {
  is_favorite: boolean;
  content_id: string;
}

// ============ RECOMMENDATION ============

export type RecommendationReason =
  | "based_on_watch_history"
  | "trending"
  | "genre_based"
  | string;

export interface Recommendation {
  content: VODContentItem;
  reason: RecommendationReason;
  source_content?: {
    id: string;
    title: string;
  };
  similarity?: string;
}

// ============ SEARCH ============

export interface VODSearchSuggestion {
  id: string;
  title: string;
  title_en?: string;
  content_type?: string;
  poster_url?: string;
}

// ============ INTERACTIVE MOMENT ============

export type InteractiveMomentType =
  | "trivia"
  | "poll"
  | "cultural_note"
  | "behind_the_scenes"
  | "recipe"
  | "historical_context";

export interface InteractiveMomentOption {
  text: string;
  text_en?: string;
  is_correct?: boolean;
  votes?: number;
}

export interface InteractiveMoment {
  id: string;
  content_id: string;
  moment_type: InteractiveMomentType;
  timestamp_seconds: number;
  duration_seconds: number;
  title: string;
  title_en?: string;
  description?: string;
  description_en?: string;
  image_url?: string;
  options?: InteractiveMomentOption[];
  season_number?: number;
  episode_number?: number;
}

// ============ PAGINATED RESPONSE ============

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

// ============ PLAYER STATE ============

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  isBuffering: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isPiP: boolean;
  selectedQuality: QualityTier | "auto";
  selectedAudioTrack: AudioTrack | null;
  selectedSubtitleLanguage: string | null;
  availableQualities: QualityTier[];
  availableAudioTracks: AudioTrack[];
  controlsVisible: boolean;
}

// ============ PLAYER SETTINGS ============

export interface PlayerSettings {
  preferredQuality: QualityTier | "auto";
  preferredSubtitleLanguage: string;
  preferredAudioLanguage: string;
  autoPlayNext: boolean;
  skipIntro: boolean;
  skipCredits: boolean;
}

// ============ VOD FILTERS ============

export interface VODFilters {
  content_format?: ContentFormat;
  genre?: string;
  sort_by?: "popularity" | "rating" | "year" | "title" | "newest";
  language?: string;
  page?: number;
  page_size?: number;
}
