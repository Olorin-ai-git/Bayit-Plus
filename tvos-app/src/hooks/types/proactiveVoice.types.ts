/**
 * Types for useProactiveVoice Hook
 *
 * Proactive voice suggestion types including time-based,
 * context-based, and presence-based suggestions for tvOS.
 */

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

export interface UseProactiveVoiceOptions {
  enabled?: boolean;
  speakSuggestions?: boolean;
  minInterval?: number;
}
