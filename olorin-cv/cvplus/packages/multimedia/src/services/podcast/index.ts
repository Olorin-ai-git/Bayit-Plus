/**
 * Podcast Generation Service Exports
 *
 * Provides podcast generation with TTS and audio processing
 */

export { PodcastGenerationService, podcastGenerationService } from './PodcastGenerationService';
export type {
  VoiceConfig,
  AudioEffects,
  PodcastGenerationConfig,
  PodcastGenerationJob,
  AudioTrack,
  PodcastMetrics,
} from './PodcastGenerationService';
export { TTSProvider, PodcastStatus } from './PodcastGenerationService';
