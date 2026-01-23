import { z } from 'zod'

// Zod schemas for runtime validation

export const PodcastEpisodeTranslationSchema = z.object({
  language: z.enum(['he', 'en']),
  audioUrl: z.string().url(),
  transcript: z.string(),
  translatedText: z.string(),
  voiceId: z.string(),
  duration: z.string().nullable(),
  createdAt: z.string().datetime(),
  fileSize: z.number().optional(),
})

export const PodcastEpisodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  audioUrl: z.string().url(),
  originalAudioUrl: z.string().url(),
  duration: z.string().optional(),
  episodeNumber: z.number().optional(),
  seasonNumber: z.number().optional(),
  publishedAt: z.string(),
  thumbnail: z.string().url().optional(),
  availableLanguages: z.array(z.enum(['he', 'en'])),
  originalLanguage: z.enum(['he', 'en']),
  translations: z.record(z.enum(['he', 'en']), PodcastEpisodeTranslationSchema),
  translationStatus: z.enum(['pending', 'processing', 'completed', 'failed']),
})

// TypeScript interfaces (inferred from Zod schemas)
export type PodcastEpisodeTranslation = z.infer<typeof PodcastEpisodeTranslationSchema>
export type PodcastEpisode = z.infer<typeof PodcastEpisodeSchema>

// Audio quality variants
export type AudioQuality = 'low' | 'medium' | 'high'

export interface AudioQualityVariant {
  quality: AudioQuality
  bitrate: string  // "64k", "96k", "128k"
  label: string  // i18n key
  recommended: boolean
}

// API Response Types
export interface GetEpisodeResponse {
  episode: PodcastEpisode
  recommendedLanguage: string  // Based on user locale
}

export interface TranslationStatusResponse {
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
}

export interface TranslationQueueResponse {
  episodeId: string
  status: 'queued' | 'already_queued' | 'failed'
  message?: string
}

// Error types for better error handling
export class PodcastTranslationError extends Error {
  constructor(
    message: string,
    public code: 'TRANSLATION_NOT_FOUND' | 'TRANSLATION_FAILED' | 'NETWORK_ERROR',
    public episodeId?: string
  ) {
    super(message)
    this.name = 'PodcastTranslationError'
  }
}
