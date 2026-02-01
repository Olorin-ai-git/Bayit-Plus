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
  has_shoresh_version?: boolean // Hebrew root word highlighting available
  has_heblish_version?: boolean // English with Hebrew injections available
  has_grammar_flip_version?: boolean // Hebrew words with English syntax available
  has_slang_synthesis_version?: boolean // Israeli/American slang blend available
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

// ============ HEBREW MODE ============

export type HebrewMode = 'regular' | 'nikud' | 'shoresh'

// ============ ENGLISH MODE ============

/**
 * English subtitle display modes:
 * - regular: Standard English subtitles
 * - heblish: English with Hebrew word injections (e.g., "Shalom chaverim!")
 * - grammarFlip: Hebrew words with English syntax/word order (e.g., "The yeled ate the tapuach")
 * - slangSynthesis: Modern Israeli/American slang blend (e.g., "That was totally al hapane!")
 */
export type EnglishMode = 'regular' | 'heblish' | 'grammarFlip' | 'slangSynthesis'

// ============ SPLIT MODE ============

/**
 * Split languages tuple: [leftLanguage, rightLanguage]
 * First selection = left pane, second selection = right pane
 */
export type SplitLanguages = [string, string]

// ============ SUBTITLE PREFERENCES ============

export interface SubtitlePreferences {
  enabled: boolean
  language: string | null  // Selected language code
  hebrew_mode?: HebrewMode  // Hebrew subtitle display mode
  english_mode?: EnglishMode  // English subtitle display mode
  settings: SubtitleSettings
  split_mode?: boolean  // Whether split screen is enabled
  split_languages?: SplitLanguages | null  // Two languages for split view
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
  // Middle East & Hebrew
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', flag: '🕍', rtl: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', rtl: true },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', rtl: false },

  // Major European
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', rtl: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', rtl: false },

  // Northern European
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', rtl: false },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', rtl: false },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', rtl: false },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', rtl: false },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', rtl: false },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸', rtl: false },

  // Central & Eastern European
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', rtl: false },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', rtl: false },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', rtl: false },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', rtl: false },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', rtl: false },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', rtl: false },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', rtl: false },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', rtl: false },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', rtl: false },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', rtl: false },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', rtl: false },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', rtl: false },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', rtl: false },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', rtl: false },

  // Asian
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', rtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', rtl: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', rtl: false },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', rtl: false },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', rtl: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', rtl: false },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', rtl: false },
  { code: 'tl', name: 'Filipino', nativeName: 'Tagalog', flag: '🇵🇭', rtl: false },

  // South Asian
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', rtl: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', rtl: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', rtl: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', rtl: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', rtl: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', rtl: true },

  // Other
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', rtl: false },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', rtl: false },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', rtl: false },
]

// Get language info by code
export function getLanguageInfo(code: string): SubtitleLanguage | undefined {
  return SUBTITLE_LANGUAGES.find(lang => lang.code === code)
}
