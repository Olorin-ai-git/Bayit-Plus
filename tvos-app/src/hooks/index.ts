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

// Existing hooks
export { useAudioCapture } from './useAudioCapture';
export { useTVConstantListening } from './useTVConstantListening';
export type { UseTVConstantListeningReturn, UseTVConstantListeningOptions } from './useTVConstantListening';
