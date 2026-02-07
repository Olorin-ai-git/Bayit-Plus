/**
 * tvOS Stores Index
 * Centralized exports for all Zustand stores
 */

// Multi-Window Store (adapted from mobile PiP)
export {
  useMultiWindowStore,
  type Window,
  type WindowContent,
  type WindowPosition,
  type TVLayout,
  type FocusDirection,
  type WindowState,
} from './multiWindowStore';

// useWindow hook (extracted to hooks/)
export { useWindow } from '../hooks/useWindow';

// Voice Store (TV-specific)
export {
  useVoiceStore,
  type VoiceSessionMetrics,
  type VoiceResponse,
  type VoiceError,
  type VoiceErrorType,
} from './voiceStore';

// Voice helper hooks (extracted to hooks/)
export { useVoiceSession, useAudioDucking, useWakeWord } from '../hooks/useVoiceHelpers';
