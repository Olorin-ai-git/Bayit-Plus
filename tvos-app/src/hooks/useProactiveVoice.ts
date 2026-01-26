/**
 * useProactiveVoice - Proactive Voice Suggestions Hook
 *
 * Ported from mobile with tvOS adaptations:
 * - Time-based suggestions (morning ritual, Shabbat, holidays)
 * - Context-based suggestions (content recommendations)
 * - Presence-based suggestions (welcome back messages)
 * - Auto-trigger TTS responses
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

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useProactiveVoice');

export interface ProactiveSuggestion {
  id: string;
  type: 'time-based' | 'context-based' | 'presence-based';
  message: string;
  action?: {
    type: 'navigate' | 'window' | 'content';
    payload: any;
  };
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}

interface UseProactiveVoiceOptions {
  enabled?: boolean;
  speakSuggestions?: boolean;
  minInterval?: number; // Minimum time between suggestions (ms)
}

/**
 * Hook for proactive voice suggestions on tvOS
 * Generates context-aware voice suggestions with automatic TTS
 */
export function useProactiveVoice(options: UseProactiveVoiceOptions = {}) {
  const {
    enabled = config.features.proactiveAI,
    speakSuggestions = true,
    minInterval = 300000, // 5 minutes default
  } = options;

  const voiceStore = useVoiceStore();

  const [currentSuggestion, setCurrentSuggestion] = useState<ProactiveSuggestion | null>(null);
  const [suggestionQueue, setSuggestionQueue] = useState<ProactiveSuggestion[]>([]);
  const [lastSuggestionTime, setLastSuggestionTime] = useState<number>(0);

  const appStateRef = useRef('active');
  const suggestionTimer = useRef<NodeJS.Timeout | null>(null);

  // Generate time-based suggestions
  const generateTimeBasedSuggestion = useCallback((): ProactiveSuggestion | null => {
    const hour = new Date().getHours();
    const day = new Date().getDay();

    // Morning ritual (5-9 AM)
    if (hour >= 5 && hour < 9) {
      return {
        id: 'morning-ritual',
        type: 'time-based',
        message: 'Good morning! Ready for your morning ritual?',
        action: {
          type: 'navigate',
          payload: { screen: 'MorningRitual' },
        },
        priority: 'high',
        timestamp: Date.now(),
      };
    }

    // Shabbat preparation (Friday afternoon)
    if (day === 5 && hour >= 15 && hour < 18) {
      return {
        id: 'shabbat-prep',
        type: 'time-based',
        message: 'Shabbat is approaching! Would you like to watch candle lighting preparation?',
        action: {
          type: 'navigate',
          payload: { screen: 'Judaism' },
        },
        priority: 'high',
        timestamp: Date.now(),
      };
    }

    // Evening content (8-11 PM)
    if (hour >= 20 && hour < 23) {
      return {
        id: 'evening-content',
        type: 'time-based',
        message: 'Perfect time for evening entertainment! Want to see what\'s trending?',
        action: {
          type: 'navigate',
          payload: { screen: 'Home' },
        },
        priority: 'medium',
        timestamp: Date.now(),
      };
    }

    return null;
  }, []);

  // Generate context-based suggestions
  const generateContextBasedSuggestion = useCallback((): ProactiveSuggestion | null => {
    // TV-specific: Suggest opening a window for content
    return {
      id: 'open-window',
      type: 'context-based',
      message: 'Would you like to open a new window for content?',
      action: {
        type: 'window',
        payload: { action: 'open' },
      },
      priority: 'medium',
      timestamp: Date.now(),
    };
  }, []);

  // Generate presence-based suggestions
  const generatePresenceBasedSuggestion = useCallback((): ProactiveSuggestion | null => {
    // Welcome back after app was backgrounded
    if (appStateRef.current === 'active') {
      return {
        id: 'welcome-back',
        type: 'presence-based',
        message: 'Welcome back! Would you like to continue watching?',
        action: {
          type: 'navigate',
          payload: { screen: 'continue' },
        },
        priority: 'medium',
        timestamp: Date.now(),
      };
    }

    return null;
  }, []);

  // Check if enough time has passed since last suggestion
  const canShowSuggestion = useCallback((): boolean => {
    const now = Date.now();
    return now - lastSuggestionTime >= minInterval;
  }, [lastSuggestionTime, minInterval]);

  // Show suggestion
  const showSuggestion = useCallback(
    async (suggestion: ProactiveSuggestion) => {
      if (!enabled) return;

      setCurrentSuggestion(suggestion);
      setLastSuggestionTime(Date.now());

      // Speak suggestion if enabled
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

      // Auto-clear after 30 seconds
      setTimeout(() => {
        setCurrentSuggestion(null);
      }, 30000);
    },
    [enabled, speakSuggestions],
  );

  // Execute suggestion action
  const executeSuggestion = useCallback((suggestion: ProactiveSuggestion) => {
    if (!suggestion.action) return;

    const { type, payload } = suggestion.action;

    switch (type) {
      case 'navigate':
        // Navigation would be handled by parent component
        moduleLogger.info('Navigate suggestion:', payload);
        break;

      case 'window':
        // Window action for multi-window system
        moduleLogger.info('Window action:', payload);
        break;

      case 'content':
        // Open content in a window
        moduleLogger.info('Content action:', payload);
        break;
    }

    setCurrentSuggestion(null);
  }, []);

  // Dismiss current suggestion
  const dismissSuggestion = useCallback(() => {
    setCurrentSuggestion(null);
  }, []);

  // Generate and queue suggestions
  const checkForSuggestions = useCallback(() => {
    if (!enabled || !canShowSuggestion()) return;

    // Try generating different types of suggestions
    const timeBasedSuggestion = generateTimeBasedSuggestion();
    if (timeBasedSuggestion && timeBasedSuggestion.priority === 'high') {
      showSuggestion(timeBasedSuggestion);
      return;
    }

    const contextBasedSuggestion = generateContextBasedSuggestion();
    if (contextBasedSuggestion) {
      showSuggestion(contextBasedSuggestion);
      return;
    }

    const presenceBasedSuggestion = generatePresenceBasedSuggestion();
    if (presenceBasedSuggestion) {
      showSuggestion(presenceBasedSuggestion);
    }
  }, [
    enabled,
    canShowSuggestion,
    generateTimeBasedSuggestion,
    generateContextBasedSuggestion,
    generatePresenceBasedSuggestion,
    showSuggestion,
  ]);

  // Periodic suggestion check
  useEffect(() => {
    if (!enabled) return;

    // Check for suggestions every 10 minutes
    suggestionTimer.current = setInterval(() => {
      checkForSuggestions();
    }, 600000); // 10 minutes

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(() => {
      checkForSuggestions();
    }, 5000);

    return () => {
      clearTimeout(initialTimeout);
      if (suggestionTimer.current) {
        clearInterval(suggestionTimer.current);
      }
    };
  }, [enabled, checkForSuggestions]);

  return {
    currentSuggestion,
    executeSuggestion,
    dismissSuggestion,
    suggestionQueue,
  };
}
