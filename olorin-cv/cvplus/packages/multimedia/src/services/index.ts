/**
 * CVPlus Multimedia Services - Main Export Module
 * 
 * Provides centralized access to all multimedia processing services
 * including image, video, audio, storage, and job management capabilities.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// Core Service Exports
export * from './base/MediaService';
export * from './base/ServiceFactory';
export * from './base/ErrorHandler';

// Image Services
export * from './image/ImageService';
export * from './image/ImageProcessor';
export * from './image/ImageOptimizer';

// Video Services
export * from './video/VideoService';
export * from './video/video-generation.service';
export * from './video'; // VideoGenerationService with provider fallback

// Audio Services
export * from './audio/AudioService';
export * from './audio/AudioProcessor';
export * from './audio/AudioAnalyzer';
export * from './audio/AudioTranscoder';
export * from './audio/WaveformGenerator';
export * from './audio/podcast-generation.service';
export * from './podcast'; // PodcastGenerationService with TTS integration

// Storage Services
export * from './storage/StorageService';
export * from './storage/FirebaseStorageAdapter';

// Job Management Services
export * from './jobs/JobManager';
export * from './jobs/JobProcessor';
export * from './jobs/JobQueue';

// Performance & Caching
export * from './performance-monitor.service';
export * from './cache-performance-monitor.service';

// Security & Validation
export * from './security/ValidationService';

// Integration Services (migrated from @cvplus/core)
export * from './calendar-integration.service';
export * from './integrations.service';
export * from './web-search.service';
export * from './video-providers';

// Service Registry and Configuration
export { ServiceRegistry } from './registry/ServiceRegistry';
export { ConfigManager } from './config/ConfigManager';

// Type Re-exports for convenience
export type {
  MultimediaError,
  ProcessingOptions,
  StorageProvider,
  ProcessingJob as JobOptions
} from '../types';

// Main service and factory exports
export * from './multimedia.service';
export * from './enhanced-qr.service';
export * from './enhanced-video-generation.service';
export * from './video-monitoring-hooks.service';