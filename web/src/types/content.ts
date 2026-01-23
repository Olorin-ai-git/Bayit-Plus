/**
 * Content Management Types
 * TypeScript interfaces for all content-related models
 */

// ============ VOD CONTENT ============

export interface Content {
  id: string
  title: string
  description?: string
  thumbnail?: string
  backdrop?: string
  category_id: string
  category_name?: string
  duration?: string
  year?: number
  rating?: string
  genre?: string
  cast?: string[]
  director?: string
  stream_url: string
  stream_type: 'hls' | 'dash'
  is_drm_protected: boolean
  drm_key_id?: string
  is_series: boolean
  season?: number
  episode?: number
  series_id?: string
  is_published: boolean
  is_featured: boolean
  requires_subscription: 'basic' | 'premium' | 'family'
  is_kids_content: boolean
  age_rating?: number
  content_rating?: string
  educational_tags?: string[]
  view_count: number
  avg_rating: number
  created_at: string
  updated_at: string
  published_at?: string
}

export interface ContentCreateInput {
  title: string
  description?: string
  thumbnail?: string
  backdrop?: string
  category_id: string
  duration?: string
  year?: number
  rating?: string
  genre?: string
  cast?: string[]
  director?: string
  stream_url: string
  stream_type?: string
  is_drm_protected?: boolean
  drm_key_id?: string
  is_series?: boolean
  season?: number
  episode?: number
  series_id?: string
  is_published?: boolean
  is_featured?: boolean
  requires_subscription?: string
  is_kids_content?: boolean
  age_rating?: number
  content_rating?: string
  educational_tags?: string[]
}

export interface ContentUpdateInput {
  title?: string
  description?: string
  thumbnail?: string
  backdrop?: string
  category_id?: string
  duration?: string
  year?: number
  rating?: string
  genre?: string
  cast?: string[]
  director?: string
  stream_url?: string
  stream_type?: string
  is_drm_protected?: boolean
  drm_key_id?: string
  is_series?: boolean
  season?: number
  episode?: number
  series_id?: string
  is_published?: boolean
  is_featured?: boolean
  requires_subscription?: string
  is_kids_content?: boolean
  age_rating?: number
  content_rating?: string
  educational_tags?: string[]
}

// ============ CATEGORIES ============

export interface Category {
  id: string
  name: string
  name_en?: string
  slug: string
  description?: string
  thumbnail?: string
  order: number
  is_active: boolean
  created_at: string
}

export interface CategoryCreateInput {
  name: string
  name_en?: string
  slug: string
  description?: string
  thumbnail?: string
  order?: number
  is_active?: boolean
}

export interface CategoryUpdateInput {
  name?: string
  name_en?: string
  slug?: string
  description?: string
  thumbnail?: string
  order?: number
  is_active?: boolean
}

// ============ LIVE CHANNELS ============

export interface LiveChannel {
  id: string
  name: string
  description?: string
  thumbnail?: string
  logo?: string
  stream_url: string
  stream_type: string
  is_drm_protected: boolean
  epg_source?: string
  current_show?: string
  next_show?: string
  is_active: boolean
  order: number
  requires_subscription: string
  supports_live_subtitles: boolean
  primary_language: string
  available_translation_languages: string[]
  created_at: string
  updated_at: string
}

export interface LiveChannelCreateInput {
  name: string
  description?: string
  thumbnail?: string
  logo?: string
  stream_url: string
  stream_type?: string
  is_drm_protected?: boolean
  epg_source?: string
  current_show?: string
  next_show?: string
  is_active?: boolean
  order?: number
  requires_subscription?: string
  supports_live_subtitles?: boolean
  primary_language?: string
  available_translation_languages?: string[]
}

export interface LiveChannelUpdateInput {
  name?: string
  description?: string
  thumbnail?: string
  logo?: string
  stream_url?: string
  stream_type?: string
  is_drm_protected?: boolean
  epg_source?: string
  current_show?: string
  next_show?: string
  is_active?: boolean
  order?: number
  requires_subscription?: string
  supports_live_subtitles?: boolean
  primary_language?: string
  available_translation_languages?: string[]
}

// ============ RADIO STATIONS ============

export interface RadioStation {
  id: string
  name: string
  description?: string
  logo?: string
  genre?: string
  stream_url: string
  stream_type: string
  current_show?: string
  current_song?: string
  is_active: boolean
  order: number
  created_at: string
}

export interface RadioStationCreateInput {
  name: string
  description?: string
  logo?: string
  genre?: string
  stream_url: string
  stream_type?: string
  current_show?: string
  current_song?: string
  is_active?: boolean
  order?: number
}

export interface RadioStationUpdateInput {
  name?: string
  description?: string
  logo?: string
  genre?: string
  stream_url?: string
  stream_type?: string
  current_show?: string
  current_song?: string
  is_active?: boolean
  order?: number
}

// ============ PODCASTS ============

export interface Podcast {
  id: string
  title: string
  title_en?: string
  title_es?: string
  description?: string
  description_en?: string
  description_es?: string
  author?: string
  author_en?: string
  author_es?: string
  cover?: string
  category?: string
  category_en?: string
  category_es?: string
  rss_feed?: string
  website?: string
  episode_count: number
  latest_episode_date?: string
  is_active: boolean
  order: number
  created_at: string
  updated_at: string
}

export interface PodcastCreateInput {
  title: string
  title_en?: string
  title_es?: string
  description?: string
  description_en?: string
  description_es?: string
  author?: string
  author_en?: string
  author_es?: string
  cover?: string
  category?: string
  category_en?: string
  category_es?: string
  rss_feed?: string
  website?: string
  episode_count?: number
  latest_episode_date?: string
  is_active?: boolean
  order?: number
}

export interface PodcastUpdateInput {
  title?: string
  title_en?: string
  title_es?: string
  description?: string
  description_en?: string
  description_es?: string
  author?: string
  author_en?: string
  author_es?: string
  cover?: string
  category?: string
  category_en?: string
  category_es?: string
  rss_feed?: string
  website?: string
  episode_count?: number
  latest_episode_date?: string
  is_active?: boolean
  order?: number
}

// ============ PODCAST EPISODES ============

export type TranslationStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface PodcastEpisode {
  id: string
  podcast_id: string
  title: string
  description?: string
  audio_url: string
  duration?: string
  episode_number?: number
  season_number?: number
  published_at: string
  thumbnail?: string
  // Translation fields
  translation_status?: TranslationStatus
  available_languages?: string[]
  original_language?: string
  retry_count?: number
}

export interface PodcastEpisodeCreateInput {
  title: string
  description?: string
  audio_url: string
  duration?: string
  episode_number?: number
  season_number?: number
  published_at: string
  thumbnail?: string
}

export interface PodcastEpisodeUpdateInput {
  title?: string
  description?: string
  audio_url?: string
  duration?: string
  episode_number?: number
  season_number?: number
  published_at?: string
  thumbnail?: string
}

// ============ UPLOADS ============

export interface UploadResponse {
  url: string
  filename: string
  size: number
}

export interface ValidateUrlResponse {
  valid: boolean
  message: string
}

export interface PresignedUrlResponse {
  upload_url: string
  fields: Record<string, string>
  key: string
}

// ============ PAGINATION ============

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============ API RESPONSES ============

export interface ContentImportResponse {
  message: string
  source_type: string
  source_name: string
  imported_count: number
}

export interface AvailableSource {
  name: string
  description: string
  items: any[]
}

export interface FreeContentSources {
  source_type: string
  sources: Record<string, AvailableSource>
}

// ============ FILTER/QUERY TYPES ============

export interface ContentFilters {
  search?: string
  category_id?: string
  is_featured?: boolean
  is_published?: boolean
  is_kids_content?: boolean
  page?: number
  page_size?: number
}

export interface CategoryFilters {
  is_active?: boolean
  page?: number
  page_size?: number
}

export interface LiveChannelFilters {
  is_active?: boolean
  page?: number
  page_size?: number
}

export interface RadioStationFilters {
  search?: string
  genre?: string
  is_active?: boolean
  page?: number
  page_size?: number
}

export interface PodcastFilters {
  search?: string
  category?: string
  is_active?: boolean
  page?: number
  page_size?: number
}

export interface PodcastEpisodeFilters {
  translation_status?: TranslationStatus
  page?: number
  page_size?: number
}

// ============ DEMO DATA TYPES ============

export interface DemoDataOptions {
  content?: Content[]
  categories?: Category[]
  liveChannels?: LiveChannel[]
  radioStations?: RadioStation[]
  podcasts?: Podcast[]
  episodes?: PodcastEpisode[]
}
