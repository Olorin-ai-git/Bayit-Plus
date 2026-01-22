/**
 * Audio Type Definitions
 *
 * Complete TypeScript types for audio processing, TTS, STT, and storage
 */

import { BaseDocument } from './database';
import { AudioFormat } from '../config/audio.config';

/**
 * Audio File Document (MongoDB)
 *
 * Extended from v4.0/v5.0 schema with complete fields
 */
export interface AudioFileDocument extends BaseDocument {
  _id: string;
  userId: string;
  jobId?: string; // Link to CV job

  // Audio type
  type: 'tts' | 'stt';

  // GCS storage
  gcsPath: string;
  gcsUrl?: string; // Signed URL or CDN URL

  // Audio properties (REQUIRED)
  format: AudioFormat;
  duration: number; // seconds
  size: number; // bytes
  sampleRate: number; // Hz (e.g., 44100, 48000)
  bitDepth: number; // bits (e.g., 16, 24)
  channels: number; // 1 (mono) or 2 (stereo)
  bitrate?: number; // kbps

  // Checksum for integrity validation
  checksum: string; // SHA-256 hash

  // Processing status
  status: 'processing' | 'ready' | 'failed';
  processingError?: string;

  // Provider metadata
  provider: 'elevenlabs' | 'google' | 'azure' | 'olorin';
  providerMetadata?: {
    requestId?: string;
    model?: string;
    costCredits?: number;
  };

  // Content metadata
  metadata: {
    language?: string;
    voice?: string;
    transcript?: string;
    containsPII?: boolean; // Privacy flag
    text?: string; // Original text for TTS
  };

  // NEW v6.0: Streaming state
  streaming?: {
    bufferPosition: number;
    chunkCount: number;
    streamId: string;
    isComplete: boolean;
  };

  // NEW v6.0: Real-time metadata
  realtime?: {
    latencyMs: number;
    jitterMs: number;
    packetLoss: number;
  };

  // NEW v6.0: CDN configuration
  cdn?: {
    cdnUrl: string;
    cacheTTL: number;
    edgeLocation: string;
    cacheHitRate?: number;
  };

  // NEW v6.0: Normalization data
  normalization?: {
    loudnessLUFS: number; // Target: -16 LUFS
    peakAmplitude: number;
    dynamicRange: number;
    normalized: boolean;
  };

  // Timestamps and versioning
  version: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // For temporary audio
}

/**
 * TTS Options
 */
export interface TTSOptions {
  voice?: string;
  language?: string;
  model?: string;
  stability?: number; // 0.0 - 1.0
  similarityBoost?: number; // 0.0 - 1.0
  style?: number; // 0.0 - 1.0
  useSpeakerBoost?: boolean;
}

/**
 * STT Options
 */
export interface STTOptions {
  language?: string; // Or 'auto' for detection
  model?: string;
  punctuate?: boolean;
  diarize?: boolean; // Speaker diarization
}

/**
 * Audio Processing Result
 */
export interface AudioProcessingResult {
  success: boolean;
  audioFileId: string;
  gcsPath: string;
  gcsUrl?: string;
  duration: number;
  size: number;
  format: AudioFormat;
  checksum: string;
  processingTimeMs: number;
  error?: string;
}

/**
 * Audio Upload Request
 */
export interface AudioUploadRequest {
  userId: string;
  jobId?: string;
  file: Buffer;
  filename: string;
  contentType: string;
}

/**
 * Audio Generation Request (TTS)
 */
export interface AudioGenerationRequest {
  userId: string;
  jobId?: string;
  text: string;
  options?: TTSOptions;
}

/**
 * Audio Transcription Request (STT)
 */
export interface AudioTranscriptionRequest {
  userId: string;
  jobId?: string;
  audioFileId: string;
  options?: STTOptions;
}

/**
 * Audio Cache Entry (Redis)
 */
export interface AudioCacheEntry {
  key: string; // SHA-256 hash of (text + voice + language)
  gcsUrl: string;
  audioFileId: string;
  expiresAt: number; // Unix timestamp
  hitCount: number;
  lastAccessedAt: number;
}

/**
 * Audio Normalization Parameters
 */
export interface AudioNormalizationParams {
  targetLoudnessLUFS: number; // Default: -16 LUFS
  peakNormalization: boolean;
  removesilence: boolean;
  fadeDuration: number; // seconds
}

/**
 * PII Detection Result
 */
export interface PIIDetectionResult {
  containsPII: boolean;
  detectedTypes: PIIType[];
  locations: PIILocation[];
  redactedText?: string;
}

/**
 * PII Types
 */
export type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'address'
  | 'name'
  | 'date_of_birth';

/**
 * PII Location in text
 */
export interface PIILocation {
  type: PIIType;
  start: number; // Character index
  end: number;
  value: string; // Detected value
  confidence: number; // 0.0 - 1.0
}

/**
 * Audio Quality Metrics
 */
export interface AudioQualityMetrics {
  loudnessLUFS: number;
  peakAmplitude: number; // dBFS
  dynamicRange: number; // dB
  signalToNoiseRatio: number; // dB
  bitrate: number; // kbps
  sampleRate: number; // Hz
  bitDepth: number; // bits
  isClipping: boolean;
  silenceDuration: number; // seconds
}

/**
 * Audio Streaming State
 */
export interface AudioStreamingState {
  streamId: string;
  userId: string;
  jobId?: string;
  status: 'initializing' | 'streaming' | 'completed' | 'error';
  chunkCount: number;
  bytesStreamed: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Audio Rate Limit Info
 */
export interface AudioRateLimitInfo {
  userId: string;
  hourlyCount: number;
  hourlyLimit: number;
  dailyCount: number;
  dailyLimit: number;
  resetAt: Date;
  exceeded: boolean;
}

/**
 * Audio Migration Validation Result
 */
export interface AudioMigrationValidationResult {
  totalAudioFiles: number;
  validatedFiles: number;
  failedFiles: number;
  missingFiles: string[]; // GCS paths
  checksumMismatches: string[]; // Audio file IDs
  sizeMismatches: string[]; // Audio file IDs
  errors: Array<{
    audioFileId: string;
    error: string;
  }>;
}

/**
 * Voice Configuration
 */
export interface VoiceConfiguration {
  voiceId: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  age: 'young' | 'middle_aged' | 'old';
  accent?: string;
  provider: 'elevenlabs' | 'google' | 'azure';
}
