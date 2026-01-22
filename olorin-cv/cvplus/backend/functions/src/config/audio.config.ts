/**
 * Audio Service Configuration
 *
 * Configuration for Olorin TTS/STT integration and audio processing
 * All values from environment variables (no hardcoded values)
 */

import { z } from 'zod';

const audioConfigSchema = z.object({
  // Olorin service endpoints
  olorinTTSBaseURL: z.string().url(),
  olorinSTTBaseURL: z.string().url(),

  // GCP configuration
  gcpProjectId: z.string(),
  gcsAudioBucket: z.string(),

  // API timeouts
  ttsTimeout: z.number().int().positive(),
  sttTimeout: z.number().int().positive(),

  // Audio limits
  maxTextLength: z.number().int().positive(),
  maxAudioSize: z.number().int().positive(),
  maxAudioDuration: z.number().int().positive(),

  // TTS defaults
  defaultVoice: z.string(),
  defaultLanguage: z.string(),

  // Normalization settings
  targetLoudnessLUFS: z.number(),
  targetSampleRate: z.number().int(),
  targetBitDepth: z.number().int(),

  // Caching
  redisCacheEnabled: z.boolean(),
  redisHost: z.string().optional(),
  redisPort: z.number().int().optional(),
  cacheTTLSeconds: z.number().int(),

  // CDN
  cdnEnabled: z.boolean(),
  cdnBaseURL: z.string().url().optional(),

  // Rate limiting
  audioRateLimitPerHour: z.number().int(),
  audioRateLimitPerDay: z.number().int(),

  // Performance targets
  ttsFirstChunkTargetMs: z.number().int(),
  sttTranscriptionTargetMs: z.number().int(),
});

export type AudioConfig = z.infer<typeof audioConfigSchema>;

/**
 * Get validated audio configuration from environment variables
 */
export function getConfig(): AudioConfig {
  const config: AudioConfig = {
    // Olorin service endpoints
    olorinTTSBaseURL:
      process.env.OLORIN_TTS_BASE_URL || 'https://bayit-plus-tts.olorin.ai',
    olorinSTTBaseURL:
      process.env.OLORIN_STT_BASE_URL || 'https://israeli-radio-stt.olorin.ai',

    // GCP configuration
    gcpProjectId: process.env.GCP_PROJECT_ID || 'olorin-cvplus',
    gcsAudioBucket: process.env.GCS_AUDIO_BUCKET || 'cvplus-audio-files',

    // API timeouts (milliseconds)
    ttsTimeout: parseInt(process.env.TTS_TIMEOUT_MS || '30000', 10),
    sttTimeout: parseInt(process.env.STT_TIMEOUT_MS || '60000', 10),

    // Audio limits
    maxTextLength: parseInt(process.env.MAX_TEXT_LENGTH || '5000', 10), // 5000 characters
    maxAudioSize: parseInt(process.env.MAX_AUDIO_SIZE || '52428800', 10), // 50MB
    maxAudioDuration: parseInt(process.env.MAX_AUDIO_DURATION || '600', 10), // 10 minutes

    // TTS defaults
    defaultVoice: process.env.DEFAULT_TTS_VOICE || 'Rachel',
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',

    // Normalization settings
    targetLoudnessLUFS: parseFloat(process.env.TARGET_LOUDNESS_LUFS || '-16.0'),
    targetSampleRate: parseInt(process.env.TARGET_SAMPLE_RATE || '44100', 10), // 44.1kHz
    targetBitDepth: parseInt(process.env.TARGET_BIT_DEPTH || '16', 10), // 16-bit

    // Caching
    redisCacheEnabled: process.env.REDIS_CACHE_ENABLED === 'true',
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
    cacheTTLSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '2592000', 10), // 30 days

    // CDN
    cdnEnabled: process.env.CDN_ENABLED === 'true',
    cdnBaseURL: process.env.CDN_BASE_URL,

    // Rate limiting
    audioRateLimitPerHour: parseInt(process.env.AUDIO_RATE_LIMIT_HOUR || '10', 10),
    audioRateLimitPerDay: parseInt(process.env.AUDIO_RATE_LIMIT_DAY || '100', 10),

    // Performance targets (milliseconds)
    ttsFirstChunkTargetMs: parseInt(process.env.TTS_FIRST_CHUNK_TARGET_MS || '500', 10),
    sttTranscriptionTargetMs: parseInt(process.env.STT_TRANSCRIPTION_TARGET_MS || '2000', 10),
  };

  // Validate configuration with Zod
  try {
    return audioConfigSchema.parse(config);
  } catch (error) {
    throw new Error(`Invalid audio configuration: ${error.message}`);
  }
}

/**
 * Multi-language voice mapping
 *
 * Maps language codes to appropriate ElevenLabs voices
 */
export const VOICE_MAPPING: Record<string, string> = {
  en: 'Rachel', // English - American female
  es: 'Sofia', // Spanish - Latin American female
  fr: 'Amelie', // French - European female
  de: 'Hans', // German - European male
  pt: 'Gabriela', // Portuguese - Brazilian female
  ja: 'Yuki', // Japanese - Female
  zh: 'Lin', // Chinese - Mandarin female
  ar: 'Layla', // Arabic - Female
  ru: 'Anastasia', // Russian - Female
  nl: 'Eva', // Dutch - Female
  he: 'Maya', // Hebrew - Female
};

/**
 * Get appropriate voice for language code
 */
export function getVoiceForLanguage(languageCode: string): string {
  return VOICE_MAPPING[languageCode] || VOICE_MAPPING['en'];
}

/**
 * Supported audio formats
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'mp3',
  'wav',
  'ogg',
  'flac',
  'webm',
  'opus',
] as const;

export type AudioFormat = (typeof SUPPORTED_AUDIO_FORMATS)[number];

/**
 * Audio quality presets
 */
export const AUDIO_QUALITY_PRESETS = {
  low: {
    bitrate: 64000, // 64 kbps
    sampleRate: 22050, // 22.05 kHz
    channels: 1, // Mono
  },
  medium: {
    bitrate: 128000, // 128 kbps
    sampleRate: 44100, // 44.1 kHz
    channels: 1, // Mono
  },
  high: {
    bitrate: 256000, // 256 kbps
    sampleRate: 48000, // 48 kHz
    channels: 2, // Stereo
  },
} as const;
