// @ts-ignore - Export conflicts/**
 * CVPlus Multimedia - Format Constants
 * 
 * Supported file formats and MIME types for multimedia processing.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// IMAGE FORMATS
// ============================================================================

export const IMAGE_FORMATS = {
  JPEG: {
    extension: '.jpg',
    mimeType: 'image/jpeg',
    supportsTransparency: false,
    supportsAnimation: false
  },
  PNG: {
    extension: '.png',
    mimeType: 'image/png',
    supportsTransparency: true,
    supportsAnimation: false
  },
  WEBP: {
    extension: '.webp',
    mimeType: 'image/webp',
    supportsTransparency: true,
    supportsAnimation: true
  },
  GIF: {
    extension: '.gif',
    mimeType: 'image/gif',
    supportsTransparency: true,
    supportsAnimation: true
  },
  SVG: {
    extension: '.svg',
    mimeType: 'image/svg+xml',
    supportsTransparency: true,
    supportsAnimation: false
  },
  BMP: {
    extension: '.bmp',
    mimeType: 'image/bmp',
    supportsTransparency: false,
    supportsAnimation: false
  },
  TIFF: {
    extension: '.tiff',
    mimeType: 'image/tiff',
    supportsTransparency: true,
    supportsAnimation: false
  }
} as const;

// ============================================================================
// VIDEO FORMATS
// ============================================================================

export const VIDEO_FORMATS = {
  MP4: {
    extension: '.mp4',
    mimeType: 'video/mp4',
    container: 'mp4',
    codecs: ['h264', 'h265', 'av1']
  },
  WEBM: {
    extension: '.webm',
    mimeType: 'video/webm',
    container: 'webm',
    codecs: ['vp8', 'vp9', 'av1']
  },
  AVI: {
    extension: '.avi',
    mimeType: 'video/x-msvideo',
    container: 'avi',
    codecs: ['h264', 'xvid', 'divx']
  },
  MOV: {
    extension: '.mov',
    mimeType: 'video/quicktime',
    container: 'mov',
    codecs: ['h264', 'prores']
  },
  MKV: {
    extension: '.mkv',
    mimeType: 'video/x-matroska',
    container: 'mkv',
    codecs: ['h264', 'h265', 'vp9']
  }
} as const;

// ============================================================================
// AUDIO FORMATS
// ============================================================================

export const AUDIO_FORMATS = {
  MP3: {
    extension: '.mp3',
    mimeType: 'audio/mpeg',
    lossy: true,
    maxBitrate: 320000
  },
  AAC: {
    extension: '.aac',
    mimeType: 'audio/aac',
    lossy: true,
    maxBitrate: 512000
  },
  WAV: {
    extension: '.wav',
    mimeType: 'audio/wav',
    lossy: false,
    maxBitrate: null
  },
  FLAC: {
    extension: '.flac',
    mimeType: 'audio/flac',
    lossy: false,
    maxBitrate: null
  },
  OGG: {
    extension: '.ogg',
    mimeType: 'audio/ogg',
    lossy: true,
    maxBitrate: 500000
  },
  M4A: {
    extension: '.m4a',
    mimeType: 'audio/mp4',
    lossy: true,
    maxBitrate: 320000
  }
} as const;

// ============================================================================
// SUPPORTED FORMAT LISTS
// ============================================================================

export const SUPPORTED_IMAGE_EXTENSIONS = Object.values(IMAGE_FORMATS).map(format => format.extension);
export const SUPPORTED_VIDEO_EXTENSIONS = Object.values(VIDEO_FORMATS).map(format => format.extension);
export const SUPPORTED_AUDIO_EXTENSIONS = Object.values(AUDIO_FORMATS).map(format => format.extension);

export const SUPPORTED_IMAGE_MIME_TYPES = Object.values(IMAGE_FORMATS).map(format => format.mimeType);
export const SUPPORTED_VIDEO_MIME_TYPES = Object.values(VIDEO_FORMATS).map(format => format.mimeType);
export const SUPPORTED_AUDIO_MIME_TYPES = Object.values(AUDIO_FORMATS).map(format => format.mimeType);

// ============================================================================
// FORMAT VALIDATION PATTERNS
// ============================================================================

export const FORMAT_VALIDATION = {
  IMAGE_PATTERN: /\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff)$/i,
  VIDEO_PATTERN: /\.(mp4|webm|avi|mov|mkv)$/i,
  AUDIO_PATTERN: /\.(mp3|aac|wav|flac|ogg|m4a)$/i
} as const;

// ============================================================================
// FORMAT CONVERSION MATRIX
// ============================================================================

export const CONVERSION_SUPPORT = {
  IMAGE: {
    from: ['jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'],
    to: ['jpeg', 'png', 'webp']
  },
  VIDEO: {
    from: ['mp4', 'webm', 'avi', 'mov', 'mkv'],
    to: ['mp4', 'webm']
  },
  AUDIO: {
    from: ['mp3', 'aac', 'wav', 'flac', 'ogg', 'm4a'],
    to: ['mp3', 'aac', 'wav']
  }
} as const;

// ============================================================================
// OPTIMIZATION FORMATS
// ============================================================================

export const OPTIMIZATION_FORMATS = {
  WEB: {
    image: 'webp',
    video: 'mp4',
    audio: 'aac'
  },
  MOBILE: {
    image: 'webp',
    video: 'mp4',
    audio: 'aac'
  },
  DESKTOP: {
    image: 'png',
    video: 'mp4',
    audio: 'wav'
  }
} as const;