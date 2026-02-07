/**
 * useVoiceFeatures - Voice Feature Detection and Capabilities Hook
 *
 * Composite hook combining all voice feature capabilities.
 * Individual hooks are in separate files for maintainability.
 *
 * TV SPECIFIC:
 * - TV voice timeout (45s vs 30s mobile)
 * - Menu button trigger capability check
 * - Siri integration support
 */

import { config } from '../config/appConfig';
import { useVoiceHealth, VoiceHealth } from './useVoiceHealth';
import { useVoiceLanguageSupport, LanguageSupport } from './useVoiceLanguageSupport';
import { useVoiceCapabilities, VoiceCapabilities } from './useVoiceCapabilities';
import { useVoiceCommandSuggestions, CommandSuggestion } from './useVoiceCommandSuggestions';

// Re-export sub-hooks and types for backward compatibility
export { useVoiceHealth } from './useVoiceHealth';
export type { VoiceHealth } from './useVoiceHealth';
export { useVoiceLanguageSupport } from './useVoiceLanguageSupport';
export type { LanguageSupport } from './useVoiceLanguageSupport';
export { useVoiceCapabilities } from './useVoiceCapabilities';
export type { VoiceCapabilities } from './useVoiceCapabilities';
export { useVoiceCommandSuggestions } from './useVoiceCommandSuggestions';
export type { CommandSuggestion } from './useVoiceCommandSuggestions';

import type { VoiceFeaturesOptions } from './types/voiceFeatures.types';

export type { VoiceFeaturesOptions };

/**
 * Composite hook combining all voice feature capabilities
 * Use this for comprehensive voice system information
 */
export const useVoiceFeatures = (options: VoiceFeaturesOptions = {}) => {
  const {
    enableHealthCheck = true,
    enableLanguageSupport = true,
    defaultLanguage = config.voice.defaultLanguage,
  } = options;

  const health = enableHealthCheck ? useVoiceHealth() : null;
  const languageSupport = enableLanguageSupport
    ? useVoiceLanguageSupport(defaultLanguage)
    : null;
  const capabilities = useVoiceCapabilities();
  const commandSuggestions = useVoiceCommandSuggestions(defaultLanguage);

  return {
    // Health
    health,
    isHealthy: health?.status === 'healthy',

    // Language support
    currentLanguage: languageSupport?.currentLanguage || defaultLanguage,
    supportedLanguages: languageSupport?.supportedLanguages || [],
    isLanguageSupported: languageSupport?.isLanguageSupported || (() => true),
    setLanguage: languageSupport?.setLanguage || (async () => {}),

    // Capabilities
    menuButtonTriggerAvailable: capabilities.menuButtonTriggerAvailable,
    wakeWordAvailable: capabilities.wakeWordAvailable,
    ttsAvailable: capabilities.ttsAvailable,
    speechRecognitionAvailable: capabilities.speechRecognitionAvailable,
    maxListeningDurationMs: capabilities.maxListeningDurationMs,
    voiceFeaturesEnabled: capabilities.voiceFeaturesEnabled,

    // Command suggestions
    commandSuggestions,
  };
};
