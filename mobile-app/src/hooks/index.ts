/**
 * Hooks Export
 */

export { useVoiceMobile } from './useVoiceMobile';
export { useProactiveVoice } from './useProactiveVoice';
export { useCarPlay } from './useCarPlay';
export { useConversationContextMobile } from './useConversationContextMobile';

// Voice Features Hooks
export {
  useVoiceCommand,
  useVoiceState,
  useVoiceMetrics,
  useVoiceCommandSuggestions,
  useVoiceHealth,
  useVoiceFeatures,
} from './useVoiceFeatures';
export type { VoiceStateHookOptions, VoiceFeatureOptions } from './useVoiceFeatures';

// Accessibility Hooks
export { useScaledFontSize } from './useScaledFontSize';
export { useReducedMotion } from './useReducedMotion';
export { useAccessibility } from './useAccessibility';
export { useAccessibilityProps } from './useAccessibilityProps';
export { useSafeAreaPadding } from './useSafeAreaPadding';
