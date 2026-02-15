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

// Chess Game Hook
export { useChessGame } from './useChessGame';

// Auth & Security Hooks
export { useMFA } from './useMFA';
export { usePasskeyNative } from './usePasskeyNative';

// Accessibility Hooks
export { useScaledFontSize } from './useScaledFontSize';
export { useReducedMotion } from './useReducedMotion';
export { useAccessibility } from './useAccessibility';
export { useAccessibilityProps } from './useAccessibilityProps';
export { useSafeAreaPadding } from './useSafeAreaPadding';

// Scene Search Hook
export { useSceneSearch } from './useSceneSearch';
export type { SceneSearchResult } from './useSceneSearch';

// Player Feature Hooks
export { useAICompanion } from './useAICompanion';
export type { CompanionTab, UseAICompanionReturn } from './useAICompanion';
export { useSubtitleMode } from './useSubtitleMode';
export type { SubtitleMode, UseSubtitleModeReturn } from './useSubtitleMode';

// Glossary Hook
export { useGlossary } from './useGlossary';
export type { GlossaryEntry } from './useGlossary';

// Star Story Hook
export { useStarStory } from './useStarStory';
export type { StarStoryAvatar, StarStoryEpisode, GenerationProgress } from './useStarStory';

// AI Onboarding
export { useAIOnboarding } from './useAIOnboarding';
export type { AIOnboardingStep } from './useAIOnboarding';

// Platform Features (Phase 4)
export { useDeepLinking } from './useDeepLinking';
export { usePushNotifications } from './usePushNotifications';

// Widget Integration
export { useWidgetSync, usePlaybackSync } from './useWidgetSync';
