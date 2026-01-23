/**
 * Type definitions and Zod schemas for EPG recording
 * @module epg/record/types
 */

import { z } from 'zod'

/**
 * Recording settings schema
 */
export const RecordingSettingsSchema = z.object({
  enableSubtitles: z.boolean(),
  language: z.string().min(2).max(5),
})

export type RecordingSettings = z.infer<typeof RecordingSettingsSchema>

/**
 * Language option schema
 */
export const LanguageOptionSchema = z.object({
  code: z.string().min(2).max(5),
  label: z.string().min(1),
  flag: z.string().min(1),
})

export type LanguageOption = z.infer<typeof LanguageOptionSchema>

/**
 * Available subtitle languages
 */
export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
]

/**
 * Quota info schema
 */
export const QuotaInfoSchema = z.object({
  storage_usage_percentage: z.number().min(0).max(100),
  storage_available_formatted: z.string(),
})

export type QuotaInfo = z.infer<typeof QuotaInfoSchema>
