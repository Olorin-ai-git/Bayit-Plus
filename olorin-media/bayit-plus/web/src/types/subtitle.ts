/**
 * Subtitle Types
 * TypeScript interfaces for subtitle-related models
 */

// ============ SUBTITLE CUE ============

export interface SubtitleCue {
  index: number
  start_time: number  // seconds
  end_time: number    // seconds
  text: string
  settings?: string   // VTT settings (position, align, etc.)
}

// ============ SUBTITLE TRACK ============

export interface SubtitleTrack {
  id: string
  content_id: string
  content_type: 'vod' | 'live'
  language: string  // ISO 639-1 code (e.g., "en", "he", "es")
  language_name: string  // Human-readable name (e.g., "English", "עברית")
  format: 'vtt' | 'srt'
  cues: SubtitleCue[]
  has_nikud_version: boolean  // Hebrew vocalization available
  is_default: boolean
  is_auto_generated: boolean
  created_at: string
}

// ============ SUBTITLE SETTINGS ============

export interface SubtitleSettings {
  fontSize: 'small' | 'medium' | 'large'
  position: 'top' | 'bottom'
  backgroundColor: string  // rgba color
  textColor: string        // hex color
  fontFamily?: string
  opacity?: number
}

// ============ SUBTITLE PREFERENCES ============

export interface SubtitlePreferences {
  enabled: boolean
  language: string | null  // Selected language code
  settings: SubtitleSettings
}

// ============ LIVE SUBTITLE CUE ============

export interface LiveSubtitleCue {
  text: string
  original_text: string
  timestamp: number
  source_lang: string
  target_lang: string
  displayUntil?: number  // Timestamp when to hide (client-side)
}

// ============ API RESPONSES ============

export interface SubtitleTracksResponse {
  tracks: SubtitleTrack[]
  default_language: string | null
}

export interface SubtitleCuesResponse {
  content_id: string
  language: string
  cues: SubtitleCue[]
  format: string
  has_nikud_version: boolean
}

// ============ LANGUAGE INFO ============

export interface SubtitleLanguage {
  code: string  // ISO 639-1
  name: string
  nativeName: string
  flag?: string  // Emoji or URL
  rtl: boolean   // Right-to-left
}

// Common subtitle languages for Bayit+
export const SUBTITLE_LANGUAGES: SubtitleLanguage[] = [
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', rtl: false },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', flag: '🕍', rtl: true },
]

// Get language info by code
export function getLanguageInfo(code: string): SubtitleLanguage | undefined {
  return SUBTITLE_LANGUAGES.find(lang => lang.code === code)
}
