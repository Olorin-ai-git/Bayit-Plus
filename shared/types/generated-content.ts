/**
 * Generated Content Types
 *
 * Shared TypeScript types for CVPlus multimedia content generation.
 * Based on data-model.md specification.
 *
 * @fileoverview Multimedia content types including GeneratedContent, ContentType, and generation services
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// Core Generated Content Interface
// ============================================================================

/**
 * Multimedia assets created from CV content with comprehensive metadata
 */
export interface GeneratedContent {
  // Identity
  /** UUID primary key */
  id: string;
  /** Foreign key to CVJob */
  jobId: string;
  /** Type of generated content */
  contentType: ContentType;

  // Content Storage
  /** Firebase Storage URL for generated content */
  fileUrl: string;
  /** Thumbnail or preview URL */
  previewUrl?: string;

  // File Metadata
  /** Generated filename */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** MIME type of generated content */
  mimeType: string;
  /** Duration for audio/video content (seconds) */
  duration?: number;

  // Generation Details
  /** Service-specific generation parameters */
  generationParameters: Record<string, any>;
  /** External service used for generation */
  generatedWith: string;
  /** API cost in USD for generation */
  generationCost: number;

  // Processing Status
  /** Current generation status */
  status: GenerationStatus;
  /** Error message if generation failed */
  errorMessage?: string;
  /** Detailed error information for debugging */
  errorDetails?: GenerationErrorDetails;

  // Quality Metrics
  /** Quality score of generated content (0-100) */
  qualityScore?: number;
  /** User satisfaction rating (1-5) */
  userRating?: number;
  /** Processing time in milliseconds */
  processingTimeMs?: number;

  // Expiration and Cleanup
  /** Content expiration date for temporary files */
  expiresAt?: Timestamp;
  /** Whether content should be preserved */
  isPermanent: boolean;

  // Audit
  /** Generation completion timestamp */
  createdAt: Timestamp;
  /** Last content update timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// Content Type Management
// ============================================================================

/**
 * Available types of generated content
 */
export enum ContentType {
  /** AI-generated podcast audio file */
  PODCAST_AUDIO = 'podcast_audio',
  /** AI-generated video introduction */
  VIDEO_INTRO = 'video_intro',
  /** Interactive timeline visualization */
  TIMELINE_SVG = 'timeline_svg',
  /** Portfolio gallery PDF */
  PORTFOLIO_PDF = 'portfolio_pdf',
  /** QR code for profile sharing */
  QR_CODE_PNG = 'qr_code_png',
  /** Enhanced CV in PDF format */
  ENHANCED_CV_PDF = 'enhanced_cv_pdf',
  /** Enhanced CV in Word format */
  ENHANCED_CV_DOCX = 'enhanced_cv_docx',
  /** Interactive HTML CV */
  ENHANCED_CV_HTML = 'enhanced_cv_html',
  /** Professional headshot AI-generated */
  HEADSHOT_IMAGE = 'headshot_image',
  /** Skills visualization chart */
  SKILLS_CHART = 'skills_chart',
  /** Career progression infographic */
  CAREER_INFOGRAPHIC = 'career_infographic'
}

/**
 * Type guard to check if value is a valid ContentType
 */
export function isContentType(value: string): value is ContentType {
  return Object.values(ContentType).includes(value as ContentType);
}

/**
 * Get MIME type for content type
 */
export function getMimeType(contentType: ContentType): string {
  const mimeTypeMap: Record<ContentType, string> = {
    [ContentType.PODCAST_AUDIO]: 'audio/mpeg',
    [ContentType.VIDEO_INTRO]: 'video/mp4',
    [ContentType.TIMELINE_SVG]: 'image/svg+xml',
    [ContentType.PORTFOLIO_PDF]: 'application/pdf',
    [ContentType.QR_CODE_PNG]: 'image/png',
    [ContentType.ENHANCED_CV_PDF]: 'application/pdf',
    [ContentType.ENHANCED_CV_DOCX]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    [ContentType.ENHANCED_CV_HTML]: 'text/html',
    [ContentType.HEADSHOT_IMAGE]: 'image/jpeg',
    [ContentType.SKILLS_CHART]: 'image/png',
    [ContentType.CAREER_INFOGRAPHIC]: 'image/png'
  };
  return mimeTypeMap[contentType];
}

/**
 * Check if content type requires duration metadata
 */
export function requiresDuration(contentType: ContentType): boolean {
  return [ContentType.PODCAST_AUDIO, ContentType.VIDEO_INTRO].includes(contentType);
}

/**
 * Check if content type supports preview generation
 */
export function supportsPreview(contentType: ContentType): boolean {
  return [
    ContentType.VIDEO_INTRO,
    ContentType.ENHANCED_CV_PDF,
    ContentType.PORTFOLIO_PDF,
    ContentType.ENHANCED_CV_HTML,
    ContentType.CAREER_INFOGRAPHIC
  ].includes(contentType);
}

// ============================================================================
// Generation Status Management
// ============================================================================

/**
 * Generation processing status
 */
export enum GenerationStatus {
  /** Generation request queued */
  PENDING = 'pending',
  /** Currently generating content */
  GENERATING = 'generating',
  /** Generation completed successfully */
  COMPLETED = 'completed',
  /** Generation failed with error */
  FAILED = 'failed',
  /** Generation cancelled by user */
  CANCELLED = 'cancelled',
  /** Content expired and deleted */
  EXPIRED = 'expired'
}

/**
 * Type guard for GenerationStatus
 */
export function isGenerationStatus(value: string): value is GenerationStatus {
  return Object.values(GenerationStatus).includes(value as GenerationStatus);
}

/**
 * Check if status represents a terminal state
 */
export function isTerminalGenerationStatus(status: GenerationStatus): boolean {
  return [
    GenerationStatus.COMPLETED,
    GenerationStatus.FAILED,
    GenerationStatus.CANCELLED,
    GenerationStatus.EXPIRED
  ].includes(status);
}

// ============================================================================
// Generation Services
// ============================================================================

/**
 * Supported external generation services
 */
export enum GenerationService {
  ELEVENLABS = 'elevenlabs',
  DID = 'd-id',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  INTERNAL = 'internal',
  CANVA = 'canva',
  FIGMA = 'figma'
}

/**
 * Service capabilities mapping
 */
export interface ServiceCapability {
  service: GenerationService;
  contentTypes: ContentType[];
  maxFileSize: number; // bytes
  costPerUnit: number; // USD
  averageProcessingTime: number; // seconds
}

/**
 * Get service capabilities
 */
export function getServiceCapabilities(): ServiceCapability[] {
  return [
    {
      service: GenerationService.ELEVENLABS,
      contentTypes: [ContentType.PODCAST_AUDIO],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      costPerUnit: 0.30,
      averageProcessingTime: 45
    },
    {
      service: GenerationService.DID,
      contentTypes: [ContentType.VIDEO_INTRO],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      costPerUnit: 0.20,
      averageProcessingTime: 120
    },
    {
      service: GenerationService.INTERNAL,
      contentTypes: [
        ContentType.TIMELINE_SVG,
        ContentType.QR_CODE_PNG,
        ContentType.ENHANCED_CV_PDF,
        ContentType.ENHANCED_CV_DOCX,
        ContentType.ENHANCED_CV_HTML,
        ContentType.SKILLS_CHART,
        ContentType.CAREER_INFOGRAPHIC
      ],
      maxFileSize: 25 * 1024 * 1024, // 25MB
      costPerUnit: 0.05,
      averageProcessingTime: 30
    }
  ];
}

// ============================================================================
// Generation Parameters
// ============================================================================

/**
 * Parameters for podcast audio generation
 */
export interface PodcastGenerationParams {
  /** Voice model to use */
  voiceId: string;
  /** Speech speed (0.5-2.0) */
  speed: number;
  /** Audio quality setting */
  quality: 'standard' | 'high';
  /** Background music preference */
  includeMusic: boolean;
  /** Maximum duration in seconds */
  maxDuration: number;
}

/**
 * Parameters for video generation
 */
export interface VideoGenerationParams {
  /** Avatar or presenter ID */
  avatarId: string;
  /** Video resolution */
  resolution: '720p' | '1080p';
  /** Background setting */
  background: string;
  /** Include captions */
  includeCaptions: boolean;
  /** Video duration in seconds */
  maxDuration: number;
}

/**
 * Parameters for CV enhancement
 */
export interface CVEnhancementParams {
  /** Template style */
  template: string;
  /** Color scheme */
  colorScheme: string;
  /** Include QR code */
  includeQRCode: boolean;
  /** Font selection */
  fontFamily: string;
  /** Page layout */
  layout: 'single-column' | 'two-column' | 'modern';
}

/**
 * Parameters for infographic generation
 */
export interface InfographicParams {
  /** Chart type */
  chartType: 'timeline' | 'skills-radar' | 'career-path';
  /** Color palette */
  colorPalette: string[];
  /** Include animations */
  animated: boolean;
  /** Export format */
  format: 'png' | 'svg' | 'pdf';
}

// ============================================================================
// Error Details
// ============================================================================

/**
 * Detailed error information for failed generations
 */
export interface GenerationErrorDetails {
  /** Error category */
  category: ErrorCategory;
  /** External service error code */
  serviceErrorCode?: string;
  /** Raw error response from service */
  serviceResponse?: string;
  /** Retry count */
  retryCount: number;
  /** Whether error is retryable */
  isRetryable: boolean;
  /** Suggested user action */
  userAction?: string;
}

/**
 * Error categories for troubleshooting
 */
export enum ErrorCategory {
  QUOTA_EXCEEDED = 'quota_exceeded',
  INVALID_INPUT = 'invalid_input',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  TIMEOUT = 'timeout',
  AUTHENTICATION = 'authentication',
  FILE_TOO_LARGE = 'file_too_large',
  UNSUPPORTED_FORMAT = 'unsupported_format',
  INSUFFICIENT_CREDITS = 'insufficient_credits',
  INTERNAL_ERROR = 'internal_error'
}

// ============================================================================
// Validation and Utilities
// ============================================================================

/**
 * Validate GeneratedContent before database operations
 */
export function validateGeneratedContent(content: Partial<GeneratedContent>): string[] {
  const errors: string[] = [];

  // Required fields
  if (!content.jobId) errors.push('Job ID is required');
  if (!content.contentType) errors.push('Content type is required');
  if (!content.fileName) errors.push('File name is required');

  // Content type validation
  if (content.contentType && !isContentType(content.contentType)) {
    errors.push('Invalid content type');
  }

  // File size validation
  if (content.fileSize !== undefined && content.fileSize <= 0) {
    errors.push('File size must be positive');
  }

  // Duration validation for audio/video
  if (content.contentType && requiresDuration(content.contentType)) {
    if (content.duration === undefined) {
      errors.push(`Duration is required for ${content.contentType}`);
    } else if (content.duration <= 0) {
      errors.push('Duration must be positive');
    }
  }

  // Cost validation
  if (content.generationCost !== undefined && content.generationCost < 0) {
    errors.push('Generation cost cannot be negative');
  }

  // Quality score validation
  if (content.qualityScore !== undefined) {
    if (content.qualityScore < 0 || content.qualityScore > 100) {
      errors.push('Quality score must be between 0 and 100');
    }
  }

  // User rating validation
  if (content.userRating !== undefined) {
    if (content.userRating < 1 || content.userRating > 5) {
      errors.push('User rating must be between 1 and 5');
    }
  }

  return errors;
}

/**
 * Type guard for GeneratedContent
 */
export function isGeneratedContent(obj: any): obj is GeneratedContent {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.jobId === 'string' &&
    isContentType(obj.contentType) &&
    typeof obj.fileUrl === 'string' &&
    typeof obj.fileName === 'string' &&
    typeof obj.fileSize === 'number' &&
    typeof obj.mimeType === 'string' &&
    isGenerationStatus(obj.status) &&
    obj.createdAt instanceof Timestamp
  );
}

/**
 * Calculate total generation cost for a job
 */
export function calculateTotalCost(contents: GeneratedContent[]): number {
  return contents.reduce((total, content) => total + content.generationCost, 0);
}

/**
 * Get average quality score for generated content
 */
export function getAverageQualityScore(contents: GeneratedContent[]): number {
  const scoredContents = contents.filter(c => c.qualityScore !== undefined);
  if (scoredContents.length === 0) return 0;

  const total = scoredContents.reduce((sum, content) => sum + content.qualityScore!, 0);
  return Math.round((total / scoredContents.length) * 10) / 10;
}

/**
 * Get content by type
 */
export function getContentByType(
  contents: GeneratedContent[],
  contentType: ContentType
): GeneratedContent[] {
  return contents.filter(content => content.contentType === contentType);
}

/**
 * Check if content is expired
 */
export function isContentExpired(content: GeneratedContent): boolean {
  if (!content.expiresAt) return false;
  return content.expiresAt.toMillis() < Date.now();
}

/**
 * Get expired content
 */
export function getExpiredContent(contents: GeneratedContent[]): GeneratedContent[] {
  return contents.filter(content => isContentExpired(content));
}

/**
 * Estimate generation time based on content type and parameters
 */
export function estimateGenerationTime(
  contentType: ContentType,
  parameters?: Record<string, any>
): number {
  const capabilities = getServiceCapabilities();
  const capability = capabilities.find(cap => cap.contentTypes.includes(contentType));

  if (!capability) return 60; // Default 60 seconds

  let estimatedTime = capability.averageProcessingTime;

  // Adjust based on parameters
  if (parameters) {
    switch (contentType) {
      case ContentType.PODCAST_AUDIO:
        const maxDuration = parameters.maxDuration as number;
        if (maxDuration) {
          estimatedTime = Math.max(estimatedTime, maxDuration * 0.5);
        }
        break;
      case ContentType.VIDEO_INTRO:
        const videoDuration = parameters.maxDuration as number;
        if (videoDuration) {
          estimatedTime = Math.max(estimatedTime, videoDuration * 2);
        }
        break;
    }
  }

  return estimatedTime;
}

/**
 * Get service for content type
 */
export function getServiceForContentType(contentType: ContentType): GenerationService {
  const capabilities = getServiceCapabilities();
  const capability = capabilities.find(cap => cap.contentTypes.includes(contentType));
  return capability?.service || GenerationService.INTERNAL;
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration to human readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${remainingSeconds}s`;
  }
}