/**
 * tvOS Voice Hooks - Central Export
 *
 * Complete voice system integration for tvOS:
 * - Menu button voice activation
 * - Proactive voice suggestions
 * - Voice feature detection
 * - Conversation context management
 * - Siri Scene Search integration
 */

// Main voice hooks
export { useVoiceTV } from './useVoiceTV';
export type { UseVoiceTVResult } from './useVoiceTV';

export { useProactiveVoice } from './useProactiveVoice';
export type { ProactiveSuggestion } from './useProactiveVoice';

// Voice feature detection
export {
  useVoiceHealth,
  useVoiceLanguageSupport,
  useVoiceCapabilities,
  useVoiceCommandSuggestions,
  useVoiceFeatures,
} from './useVoiceFeatures';

// Menu button integration
export { useMenuButtonVoice } from './useMenuButtonVoice';
export type { UseMenuButtonVoiceResult } from './useMenuButtonVoice';

// Conversation context
export { useConversationContext } from './useConversationContext';
export type { ConversationEntry, ConversationContextData, UseConversationContextResult } from './useConversationContext';

// Siri Scene Search and Top Shelf
export {
  useSiriIntentDonation,
  useSceneSearchHandler,
  useTopShelf,
  useTVVoiceShortcuts,
} from './useTVVoiceShortcuts';
export type {
  SceneSearchResult,
  TopShelfItem,
  UseTVVoiceShortcutsResult,
} from './useTVVoiceShortcuts';

// Beta 500 enrollment check
export { useBetaUser } from './useBetaUser';

// AI Recommendations
export { useAIRecommendations, RECOMMENDATION_CATEGORIES } from './useAIRecommendations';
export type { RecommendationItem, RecommendationCategory } from './useAIRecommendations';

// AI Search
export { useAISearch } from './useAISearch';
export type { SearchResult } from './useAISearch';

// Voice Search
export { useSearchVoice } from './useSearchVoice';

// Existing hooks
export { useAudioCapture } from './useAudioCapture';
export { useTVConstantListening } from './useTVConstantListening';
export type { UseTVConstantListeningReturn, UseTVConstantListeningOptions } from './useTVConstantListening';

// Window hook (extracted from multiWindowStore)
export { useWindow } from './useWindow';

// Voice helper hooks (extracted from voiceStore)
export { useVoiceSession, useAudioDucking, useWakeWord } from './useVoiceHelpers';
