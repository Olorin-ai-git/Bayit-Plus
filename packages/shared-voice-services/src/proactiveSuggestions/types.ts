/**
 * Proactive Suggestions Types
 * Type definitions for proactive AI suggestions
 */

export type SuggestionTrigger =
  | 'time-based'
  | 'context-based'
  | 'presence-based'
  | 'pattern-based'
  | 'idle-based';

export type SuggestionCategory =
  | 'content-discovery'
  | 'feature-education'
  | 'personalization'
  | 'engagement'
  | 'help';

export interface ProactiveSuggestion {
  id: string;
  trigger: SuggestionTrigger;
  category: SuggestionCategory;
  priority: number; // 0-100
  title: string;
  message: string;
  action?: SuggestionAction;
  expiresAt?: number;
  createdAt: number;
}

export interface SuggestionAction {
  type: 'navigate' | 'search' | 'play' | 'configure' | 'dismiss';
  payload?: Record<string, unknown>;
}

export interface SuggestionContext {
  currentTime: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  userActivity: UserActivity;
  sessionDuration: number;
  lastInteraction: number;
  viewingHistory: string[];
  preferences: Record<string, unknown>;
}

export interface UserActivity {
  isActive: boolean;
  isIdle: boolean;
  idleDuration: number;
  currentScreen?: string;
  recentActions: string[];
}

export interface SuggestionRule {
  id: string;
  trigger: SuggestionTrigger;
  category: SuggestionCategory;
  priority: number;
  condition: (context: SuggestionContext) => boolean;
  generate: (context: SuggestionContext) => ProactiveSuggestion;
  cooldown?: number; // milliseconds
  maxPerDay?: number;
}

export interface ProactiveSuggestionsConfig {
  enabled: boolean;
  maxSuggestionsPerSession: number;
  minTimeBetweenSuggestions: number; // milliseconds
  respectDoNotDisturb: boolean;
  quietHoursStart?: number; // hour 0-23
  quietHoursEnd?: number; // hour 0-23
}
