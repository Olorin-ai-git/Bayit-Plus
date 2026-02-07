/**
 * Helpers for useProactiveVoice Hook
 *
 * Pure functions for generating proactive voice suggestions
 * based on time, context, and user presence.
 */

import type { ProactiveSuggestion } from '../types/proactiveVoice.types';

/**
 * Generate a time-based suggestion based on current hour and day.
 * Returns morning ritual, Shabbat prep, or evening content suggestions.
 */
export function generateTimeBasedSuggestion(): ProactiveSuggestion | null {
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
}

/**
 * Generate a context-based suggestion for the multi-window system.
 */
export function generateContextBasedSuggestion(): ProactiveSuggestion | null {
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
}

/**
 * Generate a presence-based suggestion (welcome back after backgrounding).
 */
export function generatePresenceBasedSuggestion(
  appState: string,
): ProactiveSuggestion | null {
  if (appState === 'active') {
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
}
