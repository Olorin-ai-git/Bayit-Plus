// @ts-ignore - Export conflicts/**
 * Media processing constants for CVPlus multimedia module
 */

import { MediaType } from '../types';

// ============================================================================
// MEDIA TYPE CONSTANTS
// ============================================================================

export const MEDIA_TYPES: Record<string, MediaType> = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
} as const;

export const SUPPORTED_IMAGE_FORMATS = [
  'jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'svg', 'bmp', 'tiff', 'heic', 'heif'
] as const;

export const SUPPORTED_VIDEO_FORMATS = [
  'mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'm4v', 'ogv', '3gp', 'wmv'
] as const;

export const SUPPORTED_AUDIO_FORMATS = [
  'mp3', 'aac', 'ogg', 'wav', 'flac', 'm4a', 'wma', 'opus', 'aiff', 'alac'
] as const;

// ============================================================================
// QUALITY LEVEL CONSTANTS
// ============================================================================

export const QUALITY_LEVELS = {
  SOURCE: 'source' as const,
  HIGH: 'high' as const,
  MEDIUM: 'medium' as const,
  LOW: 'low' as const,
  THUMBNAIL: 'thumbnail' as const,
} as const;

export const QUALITY_SCORES = {
  [QUALITY_LEVELS.SOURCE]: 100,
  [QUALITY_LEVELS.HIGH]: 85,
  [QUALITY_LEVELS.MEDIUM]: 70,
  [QUALITY_LEVELS.LOW]: 50,
  [QUALITY_LEVELS.THUMBNAIL]: 30,
} as const;

// ============================================================================
// IMAGE CONSTANTS
// ============================================================================

export const IMAGE_MIME_TYPES = {
  'jpeg': 'image/jpeg',
  'jpg': 'image/jpeg',
  'png': 'image/png',
  'webp': 'image/webp',
  'avif': 'image/avif',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'bmp': 'image/bmp',
  'tiff': 'image/tiff',
  'heic': 'image/heic',
  'heif': 'image/heif',
} as const;

export const IMAGE_QUALITY_SETTINGS = {
  [QUALITY_LEVELS.SOURCE]: { quality: 100, progressive: false },
  [QUALITY_LEVELS.HIGH]: { quality: 90, progressive: true },
  [QUALITY_LEVELS.MEDIUM]: { quality: 80, progressive: true },
  [QUALITY_LEVELS.LOW]: { quality: 65, progressive: true },
  [QUALITY_LEVELS.THUMBNAIL]: { quality: 50, progressive: false },
} as const;

export const RESPONSIVE_BREAKPOINTS = {
  MOBILE: { width: 480, name: 'mobile' },
  TABLET: { width: 768, name: 'tablet' },
  DESKTOP: { width: 1024, name: 'desktop' },
  LARGE: { width: 1440, name: 'large' },
  XLARGE: { width: 1920, name: 'xlarge' },
} as const;

export const THUMBNAIL_SIZES = {
  SMALL: { width: 150, height: 150 },
  MEDIUM: { width: 300, height: 300 },
  LARGE: { width: 600, height: 600 },
} as const;

// ============================================================================
// VIDEO CONSTANTS
// ============================================================================

export const VIDEO_MIME_TYPES = {
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'avi': 'video/x-msvideo',
  'mov': 'video/quicktime',
  'mkv': 'video/x-matroska',
  'flv': 'video/x-flv',
  'm4v': 'video/x-m4v',
  'ogv': 'video/ogg',
  '3gp': 'video/3gpp',
  'wmv': 'video/x-ms-wmv',
} as const;

export const VIDEO_CODECS = {
  H264: 'h264',
  H265: 'h265',
  VP8: 'vp8',
  VP9: 'vp9',
  AV1: 'av1',
  XVID: 'xvid',
} as const;

export const AUDIO_CODECS = {
  AAC: 'aac',
  MP3: 'mp3',
  OPUS: 'opus',
  VORBIS: 'vorbis',
  AC3: 'ac3',
  FLAC: 'flac',
} as const;

export const VIDEO_RESOLUTIONS = {
  SD_480P: { width: 854, height: 480, name: '480p' },
  HD_720P: { width: 1280, height: 720, name: '720p' },
  FHD_1080P: { width: 1920, height: 1080, name: '1080p' },
  QHD_1440P: { width: 2560, height: 1440, name: '1440p' },
  UHD_4K: { width: 3840, height: 2160, name: '4K' },
} as const;

export const VIDEO_BITRATES = {
  [QUALITY_LEVELS.LOW]: {
    '480p': 1000000,   // 1 Mbps
    '720p': 2500000,   // 2.5 Mbps
    '1080p': 5000000,  // 5 Mbps
  },
  [QUALITY_LEVELS.MEDIUM]: {
    '480p': 1500000,   // 1.5 Mbps
    '720p': 4000000,   // 4 Mbps
    '1080p': 8000000,  // 8 Mbps
  },
  [QUALITY_LEVELS.HIGH]: {
    '480p': 2000000,   // 2 Mbps
    '720p': 6000000,   // 6 Mbps
    '1080p': 12000000, // 12 Mbps
  },
} as const;

export const VIDEO_FRAME_RATES = {
  CINEMATIC: 24,
  STANDARD: 30,
  SMOOTH: 60,
  GAMING: 120,
} as const;

// ============================================================================
// AUDIO CONSTANTS
// ============================================================================

export const AUDIO_MIME_TYPES = {
  'mp3': 'audio/mpeg',
  'aac': 'audio/aac',
  'ogg': 'audio/ogg',
  'wav': 'audio/wav',
  'flac': 'audio/flac',
  'm4a': 'audio/mp4',
  'wma': 'audio/x-ms-wma',
  'opus': 'audio/opus',
  'aiff': 'audio/aiff',
  'alac': 'audio/x-alac',
} as const;

export const AUDIO_BITRATES = {
  [QUALITY_LEVELS.LOW]: {
    mp3: 128000,  // 128 kbps
    aac: 96000,   // 96 kbps
    ogg: 112000,  // 112 kbps
  },
  [QUALITY_LEVELS.MEDIUM]: {
    mp3: 192000,  // 192 kbps
    aac: 128000,  // 128 kbps
    ogg: 160000,  // 160 kbps
  },
  [QUALITY_LEVELS.HIGH]: {
    mp3: 320000,  // 320 kbps
    aac: 256000,  // 256 kbps
    ogg: 256000,  // 256 kbps
  },
} as const;

export const AUDIO_SAMPLE_RATES = {
  PHONE: 8000,    // 8 kHz
  AM_RADIO: 11025, // 11.025 kHz
  VOICE: 22050,   // 22.05 kHz
  CD_QUALITY: 44100, // 44.1 kHz
  DVD_QUALITY: 48000, // 48 kHz
  STUDIO: 96000,  // 96 kHz
  HIGH_RES: 192000, // 192 kHz
} as const;

export const AUDIO_CHANNELS = {
  MONO: 1,
  STEREO: 2,
  SURROUND_5_1: 6,
  SURROUND_7_1: 8,
} as const;

// ============================================================================
// COMPRESSION CONSTANTS
// ============================================================================

export const COMPRESSION_ALGORITHMS = {
  GZIP: 'gzip',
  BROTLI: 'brotli',
  DEFLATE: 'deflate',
  LZ4: 'lz4',
  ZSTD: 'zstd',
} as const;

export const COMPRESSION_LEVELS = {
  NONE: 0,
  FAST: 1,
  BALANCED: 6,
  BEST: 9,
} as const;

// ============================================================================
// CACHE CONSTANTS
// ============================================================================

export const CACHE_DURATIONS = {
  VERY_SHORT: 300,      // 5 minutes
  SHORT: 1800,          // 30 minutes
  MEDIUM: 3600,         // 1 hour
  LONG: 86400,          // 24 hours
  VERY_LONG: 604800,    // 7 days
  PERMANENT: 31536000,  // 1 year
} as const;

export const CACHE_KEYS = {
  PROCESSED_IMAGE: 'processed:image:',
  PROCESSED_VIDEO: 'processed:video:',
  PROCESSED_AUDIO: 'processed:audio:',
  THUMBNAIL: 'thumbnail:',
  METADATA: 'metadata:',
  WAVEFORM: 'waveform:',
} as const;

// ============================================================================
// FILE SIZE CONSTANTS
// ============================================================================

export const FILE_SIZE_UNITS = {
  BYTES: 'bytes',
  KB: 'kb',
  MB: 'mb',
  GB: 'gb',
  TB: 'tb',
} as const;

export const FILE_SIZE_MULTIPLIERS = {
  [FILE_SIZE_UNITS.BYTES]: 1,
  [FILE_SIZE_UNITS.KB]: 1024,
  [FILE_SIZE_UNITS.MB]: 1024 * 1024,
  [FILE_SIZE_UNITS.GB]: 1024 * 1024 * 1024,
  [FILE_SIZE_UNITS.TB]: 1024 * 1024 * 1024 * 1024,
} as const;

// ============================================================================
// PROCESSING STAGE CONSTANTS
// ============================================================================

export const PROCESSING_STAGES = {
  VALIDATION: 'validation',
  PREPROCESSING: 'preprocessing',
  PROCESSING: 'processing',
  POSTPROCESSING: 'postprocessing',
  OPTIMIZATION: 'optimization',
  OUTPUT: 'output-generation',
  CLEANUP: 'cleanup',
} as const;

export const PROCESSING_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

export const COLOR_SPACES = {
  SRGB: 'srgb',
  RGB: 'rgb',
  CMYK: 'cmyk',
  LAB: 'lab',
  GREY16: 'grey16',
  REC2020: 'rec2020',
  P3: 'p3',
} as const;

export const COLOR_PROFILES = {
  SRGB: 'sRGB IEC61966-2.1',
  ADOBE_RGB: 'Adobe RGB (1998)',
  PROPHOTO_RGB: 'ProPhoto RGB',
  REC2020: 'Rec. 2020',
  DCI_P3: 'DCI-P3',
} as const;

// ============================================================================
// METADATA CONSTANTS
// ============================================================================

export const EXIF_ORIENTATIONS = {
  1: 'Normal',
  2: 'Flip horizontal',
  3: 'Rotate 180°',
  4: 'Flip vertical',
  5: 'Rotate 90° CW + flip horizontal',
  6: 'Rotate 90° CW',
  7: 'Rotate 90° CCW + flip horizontal',
  8: 'Rotate 90° CCW',
} as const;

export const GPS_COORDINATE_FORMATS = {
  DECIMAL: 'decimal',
  DMS: 'degrees-minutes-seconds',
  DM: 'degrees-minutes',
} as const;

// ============================================================================
// STREAMING CONSTANTS
// ============================================================================

export const STREAMING_PROTOCOLS = {
  HLS: 'hls',
  DASH: 'dash',
  SMOOTH: 'smooth',
  PROGRESSIVE: 'progressive',
} as const;

export const STREAMING_SEGMENT_DURATIONS = {
  SHORT: 2,    // 2 seconds
  STANDARD: 6, // 6 seconds
  LONG: 10,    // 10 seconds
} as const;

// ============================================================================
// DEVICE PIXEL RATIOS
// ============================================================================

export const DEVICE_PIXEL_RATIOS = {
  STANDARD: 1,
  RETINA: 2,
  SUPER_RETINA: 3,
  ULTRA_RETINA: 4,
} as const;

// ============================================================================
// TIME CONSTANTS
// ============================================================================

export const TIME_UNITS = {
  MILLISECONDS: 'ms',
  SECONDS: 's',
  MINUTES: 'min',
  HOURS: 'h',
  DAYS: 'd',
} as const;

export const TIME_MULTIPLIERS = {
  [TIME_UNITS.MILLISECONDS]: 1,
  [TIME_UNITS.SECONDS]: 1000,
  [TIME_UNITS.MINUTES]: 60 * 1000,
  [TIME_UNITS.HOURS]: 60 * 60 * 1000,
  [TIME_UNITS.DAYS]: 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// PRIORITY CONSTANTS
// ============================================================================

export const PROCESSING_PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  URGENT: 10,
} as const;

export const QUEUE_PRIORITIES = {
  BACKGROUND: 1,
  STANDARD: 3,
  INTERACTIVE: 5,
  REALTIME: 8,
  CRITICAL: 10,
} as const;

// ============================================================================
// RETRY CONSTANTS
// ============================================================================

export const RETRY_DELAYS = {
  IMMEDIATE: 0,
  VERY_SHORT: 1000,    // 1 second
  SHORT: 5000,         // 5 seconds
  MEDIUM: 30000,       // 30 seconds
  LONG: 300000,        // 5 minutes
} as const;

export const MAX_RETRY_ATTEMPTS = {
  NETWORK: 3,
  PROCESSING: 2,
  STORAGE: 3,
  TRANSIENT: 5,
  PERMANENT: 0,
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const MAGIC_NUMBERS = {
  // Image formats
  JPEG: [0xFF, 0xD8, 0xFF],
  PNG: [0x89, 0x50, 0x4E, 0x47],
  GIF87A: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  GIF89A: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  WEBP: [0x52, 0x49, 0x46, 0x46],
  BMP: [0x42, 0x4D],
  
  // Video formats
  MP4: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  AVI: [0x52, 0x49, 0x46, 0x46],
  MOV: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
  WEBM: [0x1A, 0x45, 0xDF, 0xA3],
  
  // Audio formats
  MP3: [0x49, 0x44, 0x33], // ID3
  MP3_FRAME: [0xFF, 0xFB], // Frame sync
  WAV: [0x52, 0x49, 0x46, 0x46],
  OGG: [0x4F, 0x67, 0x67, 0x53],
  FLAC: [0x66, 0x4C, 0x61, 0x43],
} as const;

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// ============================================================================
// EVENTS CONSTANTS
// ============================================================================

export const PROCESSING_EVENTS = {
  JOB_CREATED: 'job:created',
  JOB_STARTED: 'job:started',
  JOB_PROGRESS: 'job:progress',
  JOB_COMPLETED: 'job:completed',
  JOB_FAILED: 'job:failed',
  JOB_CANCELLED: 'job:cancelled',
  
  STAGE_STARTED: 'stage:started',
  STAGE_COMPLETED: 'stage:completed',
  STAGE_FAILED: 'stage:failed',
  
  UPLOAD_STARTED: 'upload:started',
  UPLOAD_PROGRESS: 'upload:progress',
  UPLOAD_COMPLETED: 'upload:completed',
  UPLOAD_FAILED: 'upload:failed',
  
  DOWNLOAD_STARTED: 'download:started',
  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_COMPLETED: 'download:completed',
  DOWNLOAD_FAILED: 'download:failed',
} as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_VALUES = {
  // Processing
  PROCESSING_TIMEOUT: 300000,      // 5 minutes
  CHUNK_SIZE: 1024 * 1024,         // 1MB chunks
  MAX_CONCURRENT_OPERATIONS: 3,     // Concurrent operations
  
  // Quality
  DEFAULT_QUALITY: QUALITY_LEVELS.MEDIUM,
  MIN_QUALITY_SCORE: 50,
  MAX_QUALITY_SCORE: 100,
  
  // Cache
  DEFAULT_CACHE_TTL: CACHE_DURATIONS.MEDIUM,
  
  // Retry
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY: RETRY_DELAYS.SHORT,
  
  // File sizes
  MAX_FILE_SIZE: 100 * FILE_SIZE_MULTIPLIERS[FILE_SIZE_UNITS.MB], // 100MB
  MAX_IMAGE_DIMENSION: 8192,        // 8K resolution
  MAX_VIDEO_DURATION: 3600,         // 1 hour
  MAX_AUDIO_DURATION: 7200,         // 2 hours
  
  // Processing limits
  MAX_PROCESSING_JOBS: 10,
  MAX_QUEUE_SIZE: 1000,
  WORKER_TIMEOUT: 600000,           // 10 minutes
  
  // Thumbnails
  THUMBNAIL_SIZE: THUMBNAIL_SIZES.MEDIUM,
  THUMBNAIL_QUALITY: 80,
  
  // Video
  DEFAULT_VIDEO_BITRATE: 2500000,   // 2.5 Mbps
  DEFAULT_FRAME_RATE: 30,
  DEFAULT_RESOLUTION: VIDEO_RESOLUTIONS.HD_720P,
  
  // Audio
  DEFAULT_AUDIO_BITRATE: 192000,    // 192 kbps
  DEFAULT_SAMPLE_RATE: AUDIO_SAMPLE_RATES.CD_QUALITY,
  DEFAULT_AUDIO_CHANNELS: AUDIO_CHANNELS.STEREO,
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  ENABLE_GPU_ACCELERATION: 'enable_gpu_acceleration',
  ENABLE_ML_OPTIMIZATION: 'enable_ml_optimization',
  ENABLE_ADVANCED_PROCESSING: 'enable_advanced_processing',
  ENABLE_REAL_TIME_PROCESSING: 'enable_real_time_processing',
  ENABLE_BATCH_PROCESSING: 'enable_batch_processing',
  ENABLE_CDN_INTEGRATION: 'enable_cdn_integration',
  ENABLE_STREAMING: 'enable_streaming',
  ENABLE_ANALYTICS: 'enable_analytics',
  ENABLE_MONITORING: 'enable_monitoring',
  ENABLE_CACHING: 'enable_caching',
} as const;

// ============================================================================
// ENVIRONMENT CONSTANTS
// ============================================================================

export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TESTING: 'testing',
} as const;

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;