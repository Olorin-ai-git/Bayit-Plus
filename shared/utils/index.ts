/**
 * Shared Utils - Central Export File
 * Re-exports all utility functions for easy importing
 */

// Content Localization
export {
  getLocalizedName,
  getLocalizedDescription,
  getLocalizedCurrentProgram,
  getLocalizedCategory,
  getLocalizedContent,
  getLocalizedContents,
} from './contentLocalization';

// Formatters
export {
  formatDuration,
  formatDate,
  formatTime,
  formatFileSize,
} from './formatters';

// Platform Detection
export {
  isWeb,
  isMobile,
  isTV,
  isIOS,
  isAndroid,
  Platform,
} from './platform';

// RTL Helpers
export {
  getDirectionalStyle,
  getDirectionalValue,
  isRTL,
  reverseArray,
  getTextAlign,
  getFlexDirection,
} from './rtlHelpers';

// Logger
export {
  logger,
  LogLevel,
} from './logger';

// Admin Constants
export {
  ADMIN_ROUTES,
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
} from './adminConstants';

// Audio Buffer Manager
export {
  AudioBufferManager,
} from './audioBufferManager';

// VAD Detector
export {
  VADDetector,
  VADConfig,
} from './vadDetector';

// Wake Word Detector
export {
  WakeWordDetector,
  WakeWordConfig,
} from './wakeWordDetector';

// YouTube Helpers
export {
  extractYouTubeVideoId,
  isYouTubeUrl,
  getYouTubeThumbnailUrl,
  getYouTubeThumbnailFromUrl,
  getContentPosterUrl,
} from './youtube';
export type { YouTubeThumbnailQuality } from './youtube';
