// @ts-ignore - Export conflicts/**
 * CVPlus Multimedia - Quality Constants
 * 
 * Quality and compression settings for multimedia processing.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// IMAGE QUALITY SETTINGS
// ============================================================================

export const IMAGE_QUALITY = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 0.8,
  MAXIMUM: 0.95
} as const;

export type ImageQuality = typeof IMAGE_QUALITY[keyof typeof IMAGE_QUALITY];

// ============================================================================
// VIDEO QUALITY SETTINGS
// ============================================================================

export const VIDEO_QUALITY = {
  SD: {
    width: 640,
    height: 480,
    bitrate: 1000000, // 1 Mbps
    quality: 'sd'
  },
  HD: {
    width: 1280,
    height: 720,
    bitrate: 2500000, // 2.5 Mbps
    quality: 'hd'
  },
  FULL_HD: {
    width: 1920,
    height: 1080,
    bitrate: 5000000, // 5 Mbps
    quality: 'full_hd'
  },
  '4K': {
    width: 3840,
    height: 2160,
    bitrate: 15000000, // 15 Mbps
    quality: '4k'
  }
} as const;

// ============================================================================
// AUDIO QUALITY SETTINGS
// ============================================================================

export const AUDIO_QUALITY = {
  LOW: {
    bitrate: 64000, // 64 kbps
    sampleRate: 22050,
    quality: 'low'
  },
  MEDIUM: {
    bitrate: 128000, // 128 kbps
    sampleRate: 44100,
    quality: 'medium'
  },
  HIGH: {
    bitrate: 192000, // 192 kbps
    sampleRate: 48000,
    quality: 'high'
  },
  LOSSLESS: {
    bitrate: 0, // Variable/lossless
    sampleRate: 48000,
    quality: 'lossless'
  }
} as const;

// ============================================================================
// COMPRESSION RATIOS
// ============================================================================

export const COMPRESSION_RATIOS = {
  NONE: 1.0,
  LIGHT: 0.8,
  MEDIUM: 0.6,
  AGGRESSIVE: 0.4,
  MAXIMUM: 0.2
} as const;

export type CompressionRatio = typeof COMPRESSION_RATIOS[keyof typeof COMPRESSION_RATIOS];

// ============================================================================
// QUALITY PRESETS
// ============================================================================

export const QUALITY_PRESETS = {
  WEB_OPTIMIZED: {
    image: IMAGE_QUALITY.MEDIUM,
    video: VIDEO_QUALITY.HD,
    audio: AUDIO_QUALITY.MEDIUM,
    compression: COMPRESSION_RATIOS.MEDIUM
  },
  PRINT_QUALITY: {
    image: IMAGE_QUALITY.MAXIMUM,
    video: VIDEO_QUALITY.FULL_HD,
    audio: AUDIO_QUALITY.HIGH,
    compression: COMPRESSION_RATIOS.LIGHT
  },
  MOBILE_OPTIMIZED: {
    image: IMAGE_QUALITY.MEDIUM,
    video: VIDEO_QUALITY.SD,
    audio: AUDIO_QUALITY.LOW,
    compression: COMPRESSION_RATIOS.AGGRESSIVE
  },
  ARCHIVE_QUALITY: {
    image: IMAGE_QUALITY.MAXIMUM,
    video: VIDEO_QUALITY['4K'],
    audio: AUDIO_QUALITY.LOSSLESS,
    compression: COMPRESSION_RATIOS.NONE
  }
} as const;

// ============================================================================
// QUALITY METRICS
// ============================================================================

export const QUALITY_METRICS = {
  PSNR_THRESHOLDS: {
    EXCELLENT: 40,
    GOOD: 35,
    ACCEPTABLE: 30,
    POOR: 25
  },
  SSIM_THRESHOLDS: {
    EXCELLENT: 0.95,
    GOOD: 0.90,
    ACCEPTABLE: 0.80,
    POOR: 0.70
  },
  FILE_SIZE_REDUCTION_TARGETS: {
    AGGRESSIVE: 0.3, // 30% of original
    BALANCED: 0.5,   // 50% of original
    CONSERVATIVE: 0.7 // 70% of original
  }
} as const;