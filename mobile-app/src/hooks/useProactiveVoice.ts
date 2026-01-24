/**
 * useProactiveVoice - Proactive Voice Suggestions Hook
 *
 * Integrates proactive AI suggestions with mobile voice system:
 * - Time-based suggestions (morning ritual, Shabbat, holidays)
 * - Context-based suggestions (content recommendations)
 * - Presence-based suggestions (welcome back messages)
 * - Auto-trigger TTS responses
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { proactiveAgentService } from '@bayit/shared-services';
import { ttsService } from '../services/tts';
import { useAuthStore } from '@bayit/shared-stores';
import { usePiPWidgetStore } from '../stores/pipWidgetStore';
import { useNavigation } from '@react-navigation/native';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('useProactiveVoice');

export interface ProactiveSuggestion {
  id: string;
  type: 'time-based' | 'context-based' | 'presence-based';
  message: string;
  action?: {
    type: 'navigate' | 'widget' | 'content';
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

export function useProactiveVoice(options: UseProactiveVoiceOptions = {}) {
  const {
    enabled = true,
    speakSuggestions = true,
    minInterval = 300000, // 5 minutes default
  } = options;

  const navigation = useNavigation();
  const { user } = useAuthStore();
  const widgetStore = usePiPWidgetStore();

  const [currentSuggestion, setCurrentSuggestion] = useState<ProactiveSuggestion | null>(null);
  const [suggestionQueue, setSuggestionQueue] = useState<ProactiveSuggestion[]>([]);
  const [lastSuggestionTime, setLastSuggestionTime] = useState<number>(0);

  const appState = useRef(AppState.currentState);
  const suggestionTimer = useRef<NodeJS.Timeout | null>(null);

  // Generate time-based suggestions
  const generateTimeBasedSuggestion = useCallback((): ProactiveSuggestion | null => {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    const date = new Date();

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
    // Get visible widgets
    const visibleWidgets = widgetStore.getVisibleWidgets();

    // If user has no widgets, suggest adding one
    if (visibleWidgets.length === 0) {
      return {
        id: 'add-widget',
        type: 'context-based',
        message: 'Would you like to add a live TV widget to your screen?',
        action: {
          type: 'widget',
          payload: { action: 'add', type: 'live' },
        },
        priority: 'medium',
        timestamp: Date.now(),
      };
    }

    // Based on user's viewing history (placeholder - would integrate with real history)
    // For now, suggest popular content
    return {
      id: 'popular-content',
      type: 'context-based',
      message: 'Channel 13 News is live now. Would you like to watch?',
      action: {
        type: 'content',
        payload: { contentId: 'channel13', type: 'live' },
      },
      priority: 'low',
      timestamp: Date.now(),
    };
  }, [widgetStore]);

  // Generate presence-based suggestions
  const generatePresenceBasedSuggestion = useCallback((): ProactiveSuggestion | null => {
    // Welcome back after app was backgrounded
    if (appState.current === 'active') {
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
          await ttsService.speak(suggestion.message);
        } catch (error) {
          moduleLogger.error('Failed to speak suggestion:', error', error);
        }
      }

      // Auto-clear after 30 seconds
      setTimeout(() => {
        setCurrentSuggestion(null);
      }, 30000);
    },
    [enabled, speakSuggestions]
  );

  // Execute suggestion action
  const executeSuggestion = useCallback(
    (suggestion: ProactiveSuggestion) => {
      if (!suggestion.action) return;

      const { type, payload } = suggestion.action;

      switch (type) {
        case 'navigate':
          // @ts-ignore - navigation types vary
          navigation.navigate(payload.screen, payload.params);
          break;

        case 'widget':
          // Handle widget actions
          moduleLogger.debug('[useProactiveVoice] Widget action:', payload);
          break;

        case 'content':
          // Open content player
          navigation.navigate('Player', {
            id: payload.contentId,
            type: payload.type,
            title: payload.title || 'Content',
          });
          break;
      }

      setCurrentSuggestion(null);
    },
    [navigation]
  );

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

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // User returned to app
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Check for suggestions after short delay
        setTimeout(() => {
          checkForSuggestions();
        }, 2000);
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkForSuggestions]);

  // Periodic suggestion check
  useEffect(() => {
    if (!enabled) return;

    // Check for suggestions every 10 minutes
    suggestionTimer.current = setInterval(() => {
      checkForSuggestions();
    }, 600000); // 10 minutes

    // Initial check after 5 seconds
    setTimeout(() => {
      checkForSuggestions();
    }, 5000);

    return () => {
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
