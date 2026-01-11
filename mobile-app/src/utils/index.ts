/**
 * Utilities Export
 */

export { performanceMonitor, measureAsync, debounce, throttle } from './performance';
export type { PerformanceMetrics } from './performance';

export {
  accessibilityService,
  useAccessibilitySettings,
  generateContentLabel,
  generatePlaybackControlLabel,
  generateVoiceHint,
  getAnimationDuration,
  shouldDisableAnimations,
  getAccessibleTouchableProps,
  getAccessibleImageProps,
  getAccessibleTextProps,
  announceNavigation,
  announceContentChange,
  announceError,
  announceSuccess,
} from './accessibility';
export type { AccessibilitySettings } from './accessibility';

export {
  errorHandler,
  retryWithBackoff,
  withErrorHandling,
  requireNetwork,
} from './errorHandling';
export type { ErrorDetails, ErrorSeverity } from './errorHandling';
