// @ts-ignore - Export conflicts/**
 * Core media type definitions for CVPlus multimedia processing
 */

// Temporarily remove core dependency for minimal build

// Minimal ErrorDetails interface for local use
interface ErrorDetails {
  message: string;
  code?: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// BASE MEDIA TYPES
// ============================================================================

export type MediaType = 'image' | 'video' | 'audio';
export type FileFormat = ImageFormat | VideoFormat | AudioFormat;
export type QualityLevel = 'source' | 'high' | 'medium' | 'low' | 'thumbnail';
export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

// ============================================================================
// MEDIA FILE INTERFACE
// ============================================================================

export interface MediaFile {
  /** Unique identifier for the media file */
  id: string;
  
  /** Original filename */
  name: string;
  
  /** File extension */
  extension: string;
  
  /** MIME type */
  mimeType: string;
  
  /** File size in bytes */
  size: number;
  
  /** Media type classification */
  type: MediaType;
  
  /** File buffer or blob */
  data: Buffer | Blob | File;
  
  /** File buffer (compatibility) */
  buffer?: Buffer;
  
  /** File stream (compatibility) */
  stream?: NodeJS.ReadableStream;
  
  /** File metadata */
  metadata?: MediaMetadata;
  
  /** Upload timestamp */
  uploadedAt?: Date;
  
  /** User ID who uploaded the file */
  userId?: string;
  
  /** File hash for deduplication */
  hash?: string;
}

// ============================================================================
// MEDIA METADATA
// ============================================================================

export interface MediaMetadata {
  /** File creation date */
  createdAt?: Date;
  
  /** File modification date */
  modifiedAt?: Date;
  
  /** File author/creator */
  author?: string;
  
  /** File description */
  description?: string;
  
  /** File tags */
  tags?: string[];
  
  /** Custom properties */
  custom?: Record<string, unknown>;
  
  /** Storage provider */
  provider?: string;
}

// ============================================================================
// PROCESSING RESULT INTERFACES
// ============================================================================

export interface ProcessedMedia<T = unknown> {
  /** Original media file reference */
  original: MediaFile;
  
  /** Processed file data */
  processed: MediaFile;
  
  /** Processing options used */
  options: T;
  
  /** Processing metrics */
  metrics: ProcessingMetrics;
  
  /** Processing timestamp */
  processedAt: Date;
  
  /** Processing duration in milliseconds */
  duration: number;
  
  /** Quality assessment */
  quality?: QualityAssessment;
}

export interface ProcessingMetrics {
  /** Original file size */
  originalSize: number;
  
  /** Processed file size */
  processedSize: number;
  
  /** Compression ratio (0-1) */
  compressionRatio: number;
  
  /** Processing time in milliseconds */
  processingTime: number;
  
  /** Memory usage during processing */
  memoryUsage?: number;
  
  /** Quality score (0-100) */
  qualityScore?: number;
}

export interface QualityAssessment {
  /** Overall quality score (0-100) */
  overall: number;
  
  /** Sharpness score (0-100) */
  sharpness?: number;
  
  /** Color accuracy score (0-100) */
  colorAccuracy?: number;
  
  /** Noise level (0-100, lower is better) */
  noiseLevel?: number;
  
  /** Compression artifacts score (0-100, lower is better) */
  artifacts?: number;
}

// ============================================================================
// RESPONSIVE MEDIA SETS
// ============================================================================

export interface ResponsiveMediaSet {
  /** Source media file */
  source: MediaFile;
  
  /** Generated responsive versions */
  versions: ResponsiveVersion[];
  
  /** Breakpoint definitions */
  breakpoints: Breakpoint[];
  
  /** Generated srcset string for HTML */
  srcset: string;
  
  /** Default version to use */
  defaultVersion: ResponsiveVersion;
}

export interface ResponsiveVersion {
  /** Quality/size identifier */
  id: string;
  
  /** Display width */
  width: number;
  
  /** Display height */
  height?: number;
  
  /** Device pixel ratio */
  dpr: number;
  
  /** Processed media file */
  file: MediaFile;
  
  /** File URL */
  url: string;
  
  /** Intended usage context */
  usage: 'mobile' | 'tablet' | 'desktop' | 'retina';
}

export interface Breakpoint {
  /** Breakpoint name */
  name: string;
  
  /** Minimum width */
  minWidth: number;
  
  /** Maximum width */
  maxWidth?: number;
  
  /** Device pixel ratios to generate */
  devicePixelRatios: number[];
  
  /** Quality level for this breakpoint */
  quality: QualityLevel;
}

// ============================================================================
// UPLOAD INTERFACES
// ============================================================================

export interface UploadProgress {
  /** Upload session ID */
  sessionId: string;
  
  /** File being uploaded */
  file: MediaFile;
  
  /** Bytes uploaded */
  bytesUploaded: number;
  
  /** Total bytes to upload */
  totalBytes: number;
  
  /** Upload percentage (0-100) */
  percentage: number;
  
  /** Upload speed in bytes per second */
  uploadSpeed?: number;
  
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
  
  /** Upload status */
  status: 'uploading' | 'paused' | 'completed' | 'failed';
  
  /** Error details if failed */
  error?: ErrorDetails;
}

export interface UploadResult {
  /** Upload session ID */
  sessionId: string;
  
  /** Uploaded file information */
  file: MediaFile;
  
  /** Storage path */
  path: string;
  
  /** Public URL */
  url: string;
  
  /** CDN URL if available */
  cdnUrl?: string;
  
  /** File size in bytes */
  size?: number;
  
  /** Upload completion timestamp */
  completedAt: Date;
  
  /** Upload duration in milliseconds */
  duration: number;
  
  /** File hash for verification */
  hash: string;
}

// ============================================================================
// BATCH PROCESSING INTERFACES
// ============================================================================

export interface BatchProcessingJob<T = unknown> {
  /** Batch job ID */
  id: string;
  
  /** Files to process */
  files: MediaFile[];
  
  /** Processing options */
  options: T;
  
  /** Processing status */
  status: ProcessingStatus;
  
  /** Individual file statuses */
  fileStatuses: BatchFileStatus[];
  
  /** Overall progress (0-100) */
  progress: number;
  
  /** Job creation timestamp */
  createdAt: Date;
  
  /** Job start timestamp */
  startedAt?: Date;
  
  /** Job completion timestamp */
  completedAt?: Date;
  
  /** Processing results */
  results: ProcessedMedia<T>[];
  
  /** Batch processing metrics */
  metrics: BatchMetrics;
}

export interface BatchFileStatus {
  /** File ID */
  fileId: string;
  
  /** Processing status */
  status: ProcessingStatus;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Error details if failed */
  error?: ErrorDetails;
  
  /** Processing start time */
  startedAt?: Date;
  
  /** Processing completion time */
  completedAt?: Date;
}

export interface BatchMetrics {
  /** Total files processed */
  totalFiles: number;
  
  /** Successfully processed files */
  successfulFiles: number;
  
  /** Failed files */
  failedFiles: number;
  
  /** Total processing time */
  totalProcessingTime: number;
  
  /** Average processing time per file */
  averageProcessingTime: number;
  
  /** Total original size */
  totalOriginalSize: number;
  
  /** Total processed size */
  totalProcessedSize: number;
  
  /** Overall compression ratio */
  overallCompressionRatio: number;
}

// ============================================================================
// FORMAT DEFINITIONS
// ============================================================================

export type ImageFormat = 'jpeg' | 'jpg' | 'png' | 'webp' | 'avif' | 'gif' | 'svg' | 'bmp' | 'tiff';
export type VideoFormat = 'mp4' | 'webm' | 'avi' | 'mov' | 'mkv' | 'flv' | 'm4v' | 'ogv';
export type AudioFormat = 'mp3' | 'aac' | 'ogg' | 'wav' | 'flac' | 'm4a' | 'wma' | 'opus';