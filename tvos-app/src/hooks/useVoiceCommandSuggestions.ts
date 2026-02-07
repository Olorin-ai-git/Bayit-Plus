/**
 * useVoiceCommandSuggestions - Voice Command Suggestions Hook
 *
 * Provides TV-specific voice command suggestions by language
 */

import { useState, useEffect } from 'react';
import { config } from '../config/appConfig';

import { TV_COMMAND_SUGGESTIONS } from './constants/voiceFeatures';
import type { CommandSuggestion } from './types/voiceFeatures.types';

export type { CommandSuggestion };

/**
 * Hook for getting voice command suggestions
 */
export const useVoiceCommandSuggestions = (
  language: string = config.voice.defaultLanguage,
): CommandSuggestion[] => {
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);

  useEffect(() => {
    setSuggestions(TV_COMMAND_SUGGESTIONS[language] || TV_COMMAND_SUGGESTIONS.en);
  }, [language]);

  return suggestions;
};
