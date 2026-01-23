/**
 * Trivia Types
 * TypeScript interfaces for real-time trivia and fun facts feature
 */

// ============ TRIVIA FACT ============

export interface TriviaFact {
  fact_id: string
  text: string
  trigger_time: number | null
  trigger_type: 'time' | 'scene' | 'actor' | 'random'
  category: TriviaCategory
  display_duration: number
  priority: number
  related_person?: string
}

export type TriviaCategory = 'cast' | 'production' | 'location' | 'cultural' | 'historical'

// ============ TRIVIA RESPONSE ============

export interface TriviaResponse {
  content_id: string
  content_type: 'vod' | 'series_episode'
  facts: TriviaFact[]
  fact_count: number
  is_enriched: boolean
}

export interface TriviaEnrichedResponse extends TriviaResponse {
  sources_used: string[]
  tmdb_id: number | null
  created_at: string
  updated_at: string
  enriched_at?: string
}

// ============ TRIVIA PREFERENCES ============

export type TriviaFrequency = 'off' | 'low' | 'normal' | 'high'

export interface TriviaPreferences {
  enabled: boolean
  frequency: TriviaFrequency
  categories: TriviaCategory[]
  auto_dismiss: boolean
  display_duration: number
}

export const DEFAULT_TRIVIA_PREFERENCES: TriviaPreferences = {
  enabled: true,
  frequency: 'normal',
  categories: ['cast', 'production', 'cultural'],
  auto_dismiss: true,
  display_duration: 10,
}

// ============ TRIVIA SETTINGS ============

export interface TriviaSettings {
  enabled: boolean
  frequency: TriviaFrequency
  categories: TriviaCategory[]
  displayDuration: number
}

// ============ TRIVIA STATE ============

export interface TriviaState {
  facts: TriviaFact[]
  currentFact: TriviaFact | null
  isLoading: boolean
  isEnabled: boolean
  error: string | null
  lastShownAt: number | null
  shownFactIds: string[]
  preferences: TriviaPreferences
}

// ============ TRIVIA HEALTH ============

export interface TriviaHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  feature_enabled: boolean
  rollout_percentage: number
}

// ============ CATEGORY INFO ============

export interface TriviaCategoryInfo {
  id: TriviaCategory
  label_he: string
  label_en: string
  icon: string
}

export const TRIVIA_CATEGORIES: TriviaCategoryInfo[] = [
  { id: 'cast', label_he: 'שחקנים', label_en: 'Cast', icon: 'users' },
  { id: 'production', label_he: 'הפקה', label_en: 'Production', icon: 'film' },
  { id: 'location', label_he: 'מיקום', label_en: 'Location', icon: 'map-pin' },
  { id: 'cultural', label_he: 'תרבות', label_en: 'Cultural', icon: 'book-open' },
  { id: 'historical', label_he: 'היסטורי', label_en: 'Historical', icon: 'clock' },
]

// ============ FREQUENCY INFO ============

export interface TriviaFrequencyInfo {
  id: TriviaFrequency
  label_he: string
  label_en: string
  interval_seconds: number
}

export const TRIVIA_FREQUENCIES: TriviaFrequencyInfo[] = [
  { id: 'off', label_he: 'כבוי', label_en: 'Off', interval_seconds: 0 },
  { id: 'low', label_he: 'נמוך', label_en: 'Low', interval_seconds: 600 },
  { id: 'normal', label_he: 'רגיל', label_en: 'Normal', interval_seconds: 300 },
  { id: 'high', label_he: 'גבוה', label_en: 'High', interval_seconds: 120 },
]

// ============ UTILITY FUNCTIONS ============

export function getCategoryInfo(category: TriviaCategory): TriviaCategoryInfo | undefined {
  return TRIVIA_CATEGORIES.find(c => c.id === category)
}

export function getFrequencyInfo(frequency: TriviaFrequency): TriviaFrequencyInfo | undefined {
  return TRIVIA_FREQUENCIES.find(f => f.id === frequency)
}

export function getIntervalForFrequency(frequency: TriviaFrequency): number {
  const info = getFrequencyInfo(frequency)
  return info?.interval_seconds ?? 300
}
