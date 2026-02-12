/**
 * Proactive Suggestions Service
 * Manages proactive AI suggestions based on user context and behavior
 */

import type {
  ProactiveSuggestion,
  SuggestionContext,
  SuggestionRule,
  ProactiveSuggestionsConfig,
  UserActivity
} from './types';
import { ALL_SUGGESTION_RULES } from './suggestionRules';

interface SuggestionHistory {
  ruleId: string;
  lastTriggered: number;
  triggerCount: number;
}

export class ProactiveSuggestionsService {
  private config: ProactiveSuggestionsConfig;
  private activeSuggestions: ProactiveSuggestion[] = [];
  private suggestionHistory: Map<string, SuggestionHistory> = new Map();
  private dailyTriggerCounts: Map<string, Map<string, number>> = new Map(); // date -> ruleId -> count
  private listeners: Set<(suggestion: ProactiveSuggestion) => void> = new Set();

  constructor(config: Partial<ProactiveSuggestionsConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      maxSuggestionsPerSession: config.maxSuggestionsPerSession || 5,
      minTimeBetweenSuggestions: config.minTimeBetweenSuggestions || 10 * 60 * 1000, // 10 minutes
      respectDoNotDisturb: config.respectDoNotDisturb ?? true,
      quietHoursStart: config.quietHoursStart ?? undefined,
      quietHoursEnd: config.quietHoursEnd ?? undefined
    };
  }

  /**
   * Evaluate context and generate suggestions
   */
  evaluateContext(context: SuggestionContext): ProactiveSuggestion[] {
    if (!this.config.enabled) return [];

    // Check quiet hours
    if (this.isQuietHours(context.currentTime)) {
      return [];
    }

    // Clean up expired suggestions
    this.cleanupExpiredSuggestions(context.currentTime);

    // Check session limit
    if (this.activeSuggestions.length >= this.config.maxSuggestionsPerSession) {
      return [];
    }

    const newSuggestions: ProactiveSuggestion[] = [];

    // Evaluate each rule
    for (const rule of ALL_SUGGESTION_RULES) {
      // Check if rule can be triggered
      if (!this.canTriggerRule(rule, context.currentTime)) {
        continue;
      }

      // Check rule condition
      if (rule.condition(context)) {
        const suggestion = rule.generate(context);

        // Add to active suggestions
        this.activeSuggestions.push(suggestion);
        newSuggestions.push(suggestion);

        // Update history
        this.updateRuleHistory(rule.id, context.currentTime);

        // Notify listeners
        this.notifyListeners(suggestion);

        // Check session limit
        if (this.activeSuggestions.length >= this.config.maxSuggestionsPerSession) {
          break;
        }
      }
    }

    return newSuggestions;
  }

  /**
   * Get active suggestions
   */
  getActiveSuggestions(): ProactiveSuggestion[] {
    return [...this.activeSuggestions];
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(suggestionId: string): void {
    this.activeSuggestions = this.activeSuggestions.filter(s => s.id !== suggestionId);
  }

  /**
   * Clear all active suggestions
   */
  clearAllSuggestions(): void {
    this.activeSuggestions = [];
  }

  /**
   * Add suggestion listener
   */
  addListener(listener: (suggestion: ProactiveSuggestion) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProactiveSuggestionsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): ProactiveSuggestionsConfig {
    return { ...this.config };
  }

  /**
   * Reset suggestion history (for testing)
   */
  resetHistory(): void {
    this.suggestionHistory.clear();
    this.dailyTriggerCounts.clear();
    this.activeSuggestions = [];
  }

  /**
   * Check if rule can be triggered
   */
  private canTriggerRule(rule: SuggestionRule, currentTime: number): boolean {
    const history = this.suggestionHistory.get(rule.id);

    // Check cooldown
    if (history && rule.cooldown) {
      const timeSinceLastTrigger = currentTime - history.lastTriggered;
      if (timeSinceLastTrigger < rule.cooldown) {
        return false;
      }
    }

    // Check daily limit
    if (rule.maxPerDay) {
      const today = this.getDateKey(currentTime);
      const dailyCounts = this.dailyTriggerCounts.get(today);
      const todayCount = dailyCounts?.get(rule.id) || 0;

      if (todayCount >= rule.maxPerDay) {
        return false;
      }
    }

    // Check min time between any suggestions
    if (this.activeSuggestions.length > 0) {
      const mostRecentSuggestion = this.activeSuggestions[this.activeSuggestions.length - 1];
      const timeSinceLastSuggestion = currentTime - mostRecentSuggestion.createdAt;

      if (timeSinceLastSuggestion < this.config.minTimeBetweenSuggestions) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update rule trigger history
   */
  private updateRuleHistory(ruleId: string, currentTime: number): void {
    // Update overall history
    const history = this.suggestionHistory.get(ruleId);
    if (history) {
      history.lastTriggered = currentTime;
      history.triggerCount++;
    } else {
      this.suggestionHistory.set(ruleId, {
        ruleId,
        lastTriggered: currentTime,
        triggerCount: 1
      });
    }

    // Update daily count
    const today = this.getDateKey(currentTime);
    let dailyCounts = this.dailyTriggerCounts.get(today);

    if (!dailyCounts) {
      dailyCounts = new Map();
      this.dailyTriggerCounts.set(today, dailyCounts);
    }

    const currentCount = dailyCounts.get(ruleId) || 0;
    dailyCounts.set(ruleId, currentCount + 1);
  }

  /**
   * Clean up expired suggestions
   */
  private cleanupExpiredSuggestions(currentTime: number): void {
    this.activeSuggestions = this.activeSuggestions.filter(s => {
      if (!s.expiresAt) return true;
      return s.expiresAt > currentTime;
    });
  }

  /**
   * Check if current time is in quiet hours
   */
  private isQuietHours(currentTime: number): boolean {
    if (!this.config.respectDoNotDisturb) return false;
    if (this.config.quietHoursStart === undefined || this.config.quietHoursEnd === undefined) {
      return false;
    }

    const hour = new Date(currentTime).getHours();
    const start = this.config.quietHoursStart;
    const end = this.config.quietHoursEnd;

    // Handle wrap-around (e.g., 22:00 - 06:00)
    if (start > end) {
      return hour >= start || hour < end;
    }

    return hour >= start && hour < end;
  }

  /**
   * Get date key for daily tracking
   */
  private getDateKey(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  /**
   * Notify listeners of new suggestion
   */
  private notifyListeners(suggestion: ProactiveSuggestion): void {
    for (const listener of this.listeners) {
      try {
        listener(suggestion);
      } catch (error) {
        // Silently catch listener errors
      }
    }
  }
}

/**
 * Create suggestion context helper
 */
export function createSuggestionContext(
  userActivity: UserActivity,
  options: {
    viewingHistory?: string[];
    sessionDuration?: number;
    lastInteraction?: number;
    preferences?: Record<string, unknown>;
  } = {}
): SuggestionContext {
  const now = Date.now();
  const hour = new Date(now).getHours();

  let timeOfDay: SuggestionContext['timeOfDay'];
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const dayOfWeek = new Date(now).toLocaleDateString('en-US', { weekday: 'long' });

  return {
    currentTime: now,
    timeOfDay,
    dayOfWeek,
    userActivity,
    sessionDuration: options.sessionDuration || 0,
    lastInteraction: options.lastInteraction || now,
    viewingHistory: options.viewingHistory || [],
    preferences: options.preferences || {}
  };
}

// Singleton instance
export const proactiveSuggestionsService = new ProactiveSuggestionsService();
