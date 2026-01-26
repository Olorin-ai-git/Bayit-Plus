/**
 * tvOS Stores Index
 * Centralized exports for all Zustand stores
 */

// Multi-Window Store (adapted from mobile PiP)
export {
  useMultiWindowStore,
  useWindow,
  type Window,
  type WindowContent,
  type WindowPosition,
  type TVLayout,
  type FocusDirection,
  type WindowState,
} from './multiWindowStore';

// Voice Store (TV-specific)
export {
  useVoiceStore,
  useVoiceSession,
  useAudioDucking,
  useWakeWord,
  type VoiceSessionMetrics,
  type VoiceResponse,
  type VoiceError,
  type VoiceErrorType,
} from './voiceStore';
