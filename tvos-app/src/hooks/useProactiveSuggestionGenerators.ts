/**
 * Proactive suggestion generators for useProactiveVoice
 *
 * Time-based, context-based, and presence-based suggestion generation.
 */

import { useCallback, useRef } from 'react';

import type { ProactiveSuggestion } from './types/proactiveVoice.types';

export type { ProactiveSuggestion };

/**
 * Hook that provides suggestion generator functions
 */
export function useSuggestionGenerators() {
  const appStateRef = useRef('active');

  const generateTimeBasedSuggestion = useCallback((): ProactiveSuggestion | null => {
    const hour = new Date().getHours();
    const day = new Date().getDay();

    // Morning ritual (5-9 AM)
    if (hour >= 5 && hour < 9) {
      return {
        id: 'morning-ritual',
        type: 'time-based',
        message: 'Good morning! Ready for your morning ritual?',
        action: { type: 'navigate', payload: { screen: 'MorningRitual' } },
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
        action: { type: 'navigate', payload: { screen: 'Judaism' } },
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
        action: { type: 'navigate', payload: { screen: 'Home' } },
        priority: 'medium',
        timestamp: Date.now(),
      };
    }

    return null;
  }, []);

  const generateContextBasedSuggestion = useCallback((): ProactiveSuggestion | null => {
    return {
      id: 'open-window',
      type: 'context-based',
      message: 'Would you like to open a new window for content?',
      action: { type: 'window', payload: { action: 'open' } },
      priority: 'medium',
      timestamp: Date.now(),
    };
  }, []);

  const generatePresenceBasedSuggestion = useCallback((): ProactiveSuggestion | null => {
    if (appStateRef.current === 'active') {
      return {
        id: 'welcome-back',
        type: 'presence-based',
        message: 'Welcome back! Would you like to continue watching?',
        action: { type: 'navigate', payload: { screen: 'continue' } },
        priority: 'medium',
        timestamp: Date.now(),
      };
    }
    return null;
  }, []);

  return {
    generateTimeBasedSuggestion,
    generateContextBasedSuggestion,
    generatePresenceBasedSuggestion,
    appStateRef,
  };
}
