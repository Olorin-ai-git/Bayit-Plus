/**
 * useProactiveVoice - Proactive Voice Suggestions Hook
 *
 * Generates context-aware voice suggestions with automatic TTS.
 * Suggestion generators are extracted to useProactiveSuggestionGenerators.
 *
 * TV ADAPTATIONS:
 * - Focus-based visual presentation
 * - Larger text for 10-foot viewing
 * - Integration with multi-window system
 * - Top Shelf awareness
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ttsService } from '../services/tts';
import { config } from '../config/appConfig';
import { useVoiceStore } from '../stores/voiceStore';
import {
  useSuggestionGenerators,
  ProactiveSuggestion,
} from './useProactiveSuggestionGenerators';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useProactiveVoice');

// Re-export for backward compatibility
export type { ProactiveSuggestion } from './useProactiveSuggestionGenerators';

interface UseProactiveVoiceOptions {
  enabled?: boolean;
  speakSuggestions?: boolean;
  minInterval?: number;
}

/**
 * Hook for proactive voice suggestions on tvOS
 */
export function useProactiveVoice(options: UseProactiveVoiceOptions = {}) {
  const {
    enabled = config.features.proactiveAI,
    speakSuggestions = true,
    minInterval = 300000,
  } = options;

  const voiceStore = useVoiceStore();
  const generators = useSuggestionGenerators();

  const [currentSuggestion, setCurrentSuggestion] = useState<ProactiveSuggestion | null>(null);
  const [suggestionQueue, setSuggestionQueue] = useState<ProactiveSuggestion[]>([]);
  const [lastSuggestionTime, setLastSuggestionTime] = useState<number>(0);

  const suggestionTimer = useRef<NodeJS.Timeout | null>(null);

  const canShowSuggestion = useCallback(
    (): boolean => Date.now() - lastSuggestionTime >= minInterval,
    [lastSuggestionTime, minInterval],
  );

  const showSuggestion = useCallback(
    async (suggestion: ProactiveSuggestion) => {
      if (!enabled) return;
      setCurrentSuggestion(suggestion);
      setLastSuggestionTime(Date.now());

      if (speakSuggestions) {
        try {
          await ttsService.speak(suggestion.message, {
            language: config.voice.ttsLanguage,
            rate: config.voice.ttsRate,
          });
        } catch (error) {
          moduleLogger.error('Failed to speak suggestion:', error);
        }
      }

      setTimeout(() => setCurrentSuggestion(null), 30000);
    },
    [enabled, speakSuggestions],
  );

  const executeSuggestion = useCallback((suggestion: ProactiveSuggestion) => {
    if (!suggestion.action) return;
    const { type, payload } = suggestion.action;

    switch (type) {
      case 'navigate': moduleLogger.info('Navigate suggestion:', payload); break;
      case 'window': moduleLogger.info('Window action:', payload); break;
      case 'content': moduleLogger.info('Content action:', payload); break;
    }
    setCurrentSuggestion(null);
  }, []);

  const dismissSuggestion = useCallback(() => setCurrentSuggestion(null), []);

  const checkForSuggestions = useCallback(() => {
    if (!enabled || !canShowSuggestion()) return;

    const timeBased = generators.generateTimeBasedSuggestion();
    if (timeBased && timeBased.priority === 'high') { showSuggestion(timeBased); return; }

    const contextBased = generators.generateContextBasedSuggestion();
    if (contextBased) { showSuggestion(contextBased); return; }

    const presenceBased = generators.generatePresenceBasedSuggestion();
    if (presenceBased) { showSuggestion(presenceBased); }
  }, [enabled, canShowSuggestion, generators, showSuggestion]);

  useEffect(() => {
    if (!enabled) return;

    suggestionTimer.current = setInterval(() => checkForSuggestions(), 600000);
    const initialTimeout = setTimeout(() => checkForSuggestions(), 5000);

    return () => {
      clearTimeout(initialTimeout);
      if (suggestionTimer.current) clearInterval(suggestionTimer.current);
    };
  }, [enabled, checkForSuggestions]);

  return { currentSuggestion, executeSuggestion, dismissSuggestion, suggestionQueue };
}
