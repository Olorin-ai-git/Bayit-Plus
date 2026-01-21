/**
 * Video Generation Service Exports
 *
 * Provides multi-provider video generation with fallback
 */

export { VideoGenerationService, videoGenerationService } from './VideoGenerationService';
export type {
  VideoGenerationConfig,
  VideoGenerationJob,
  ProviderCredentials,
  VideoMetrics,
} from './VideoGenerationService';
export { VideoProvider, VideoStatus } from './VideoGenerationService';

// Legacy exports for backward compatibility
export { VideoGenerationService as VideoGenerationService } from './video-generation.service';
