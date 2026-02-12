/**
 * Proactive Suggestion Rules
 * Predefined rules for generating proactive suggestions
 */

import type { SuggestionRule } from './types';

const RULE_COOLDOWNS = {
  CONTENT_DISCOVERY: 2 * 60 * 60 * 1000, // 2 hours
  FEATURE_EDUCATION: 24 * 60 * 60 * 1000, // 24 hours
  ENGAGEMENT: 4 * 60 * 60 * 1000, // 4 hours
  HELP: 30 * 60 * 1000, // 30 minutes
};

/**
 * Time-based suggestion rules
 */
export const TIME_BASED_RULES: SuggestionRule[] = [
  {
    id: 'morning-content',
    trigger: 'time-based',
    category: 'content-discovery',
    priority: 70,
    cooldown: RULE_COOLDOWNS.CONTENT_DISCOVERY,
    maxPerDay: 1,
    condition: (context) => {
      return context.timeOfDay === 'morning' && context.userActivity.isActive;
    },
    generate: (_context) => ({
      id: `suggestion-${Date.now()}`,
      trigger: 'time-based',
      category: 'content-discovery',
      priority: 70,
      title: 'Good Morning!',
      message: "Start your day with something inspiring. Would you like to see today's recommended content?",
      action: {
        type: 'navigate',
        payload: { screen: 'recommendations' }
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    })
  },
  {
    id: 'evening-relaxation',
    trigger: 'time-based',
    category: 'content-discovery',
    priority: 75,
    cooldown: RULE_COOLDOWNS.CONTENT_DISCOVERY,
    maxPerDay: 1,
    condition: (context) => {
      return context.timeOfDay === 'evening' && context.userActivity.isActive;
    },
    generate: (_context) => ({
      id: `suggestion-${Date.now()}`,
      trigger: 'time-based',
      category: 'content-discovery',
      priority: 75,
      title: 'Unwind for the Evening',
      message: 'Looking to relax? Check out our calming content collection.',
      action: {
        type: 'search',
        payload: { query: 'relaxing', category: 'mood' }
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 3 * 60 * 60 * 1000 // 3 hours
    })
  }
];

/**
 * Context-based suggestion rules
 */
export const CONTEXT_BASED_RULES: SuggestionRule[] = [
  {
    id: 'continue-watching',
    trigger: 'context-based',
    category: 'engagement',
    priority: 85,
    cooldown: RULE_COOLDOWNS.ENGAGEMENT,
    condition: (context) => {
      return context.viewingHistory.length > 0 && context.userActivity.isActive;
    },
    generate: (context) => {
      const lastViewed = context.viewingHistory[0];
      return {
        id: `suggestion-${Date.now()}`,
        trigger: 'context-based',
        category: 'engagement',
        priority: 85,
        title: 'Continue Watching',
        message: `Pick up where you left off with "${lastViewed}".`,
        action: {
          type: 'play',
          payload: { contentId: lastViewed }
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 12 * 60 * 60 * 1000 // 12 hours
      };
    }
  },
  {
    id: 'similar-content',
    trigger: 'context-based',
    category: 'content-discovery',
    priority: 70,
    cooldown: RULE_COOLDOWNS.CONTENT_DISCOVERY,
    condition: (context) => {
      return context.viewingHistory.length >= 3;
    },
    generate: (_context) => ({
      id: `suggestion-${Date.now()}`,
      trigger: 'context-based',
      category: 'content-discovery',
      priority: 70,
      title: 'You Might Like This',
      message: 'Based on what you\'ve been watching, we found some similar content you might enjoy.',
      action: {
        type: 'navigate',
        payload: { screen: 'similar-content' }
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 6 * 60 * 60 * 1000 // 6 hours
    })
  }
];

/**
 * Presence-based suggestion rules
 */
export const PRESENCE_BASED_RULES: SuggestionRule[] = [
  {
    id: 'welcome-back',
    trigger: 'presence-based',
    category: 'engagement',
    priority: 80,
    cooldown: RULE_COOLDOWNS.ENGAGEMENT,
    maxPerDay: 2,
    condition: (context) => {
      const timeSinceLastInteraction = context.currentTime - context.lastInteraction;
      return timeSinceLastInteraction > 24 * 60 * 60 * 1000 && // More than 24 hours
             timeSinceLastInteraction < 7 * 24 * 60 * 60 * 1000; // Less than 7 days
    },
    generate: (_context) => ({
      id: `suggestion-${Date.now()}`,
      trigger: 'presence-based',
      category: 'engagement',
      priority: 80,
      title: 'Welcome Back!',
      message: "We've added new content since your last visit. Want to see what's new?",
      action: {
        type: 'navigate',
        payload: { screen: 'new-releases' }
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 4 * 60 * 60 * 1000 // 4 hours
    })
  }
];

/**
 * Pattern-based suggestion rules
 */
export const PATTERN_BASED_RULES: SuggestionRule[] = [
  {
    id: 'binge-watching-break',
    trigger: 'pattern-based',
    category: 'help',
    priority: 60,
    cooldown: RULE_COOLDOWNS.HELP,
    condition: (context) => {
      return context.sessionDuration > 3 * 60 * 60 * 1000 && // 3+ hours
             context.userActivity.isActive;
    },
    generate: (_context) => ({
      id: `suggestion-${Date.now()}`,
      trigger: 'pattern-based',
      category: 'help',
      priority: 60,
      title: 'Take a Break',
      message: "You've been watching for a while. Want to save your progress and continue later?",
      action: {
        type: 'dismiss'
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutes
    })
  }
];

/**
 * Idle-based suggestion rules
 */
export const IDLE_BASED_RULES: SuggestionRule[] = [
  {
    id: 'idle-discovery',
    trigger: 'idle-based',
    category: 'content-discovery',
    priority: 50,
    cooldown: RULE_COOLDOWNS.CONTENT_DISCOVERY,
    condition: (context) => {
      return context.userActivity.isIdle &&
             context.userActivity.idleDuration > 5 * 60 * 1000 && // 5 minutes idle
             context.userActivity.idleDuration < 15 * 60 * 1000; // Less than 15 minutes
    },
    generate: (_context) => ({
      id: `suggestion-${Date.now()}`,
      trigger: 'idle-based',
      category: 'content-discovery',
      priority: 50,
      title: 'Still There?',
      message: 'Explore our curated collections while you browse.',
      action: {
        type: 'navigate',
        payload: { screen: 'collections' }
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    })
  },
  {
    id: 'feature-tip',
    trigger: 'idle-based',
    category: 'feature-education',
    priority: 40,
    cooldown: RULE_COOLDOWNS.FEATURE_EDUCATION,
    maxPerDay: 1,
    condition: (context) => {
      return context.userActivity.isIdle &&
             context.userActivity.idleDuration > 3 * 60 * 1000;
    },
    generate: (_context) => ({
      id: `suggestion-${Date.now()}`,
      trigger: 'idle-based',
      category: 'feature-education',
      priority: 40,
      title: 'Pro Tip',
      message: 'Did you know you can use voice commands to search? Try saying "Find action movies".',
      action: {
        type: 'dismiss'
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    })
  }
];

/**
 * All suggestion rules combined
 */
export const ALL_SUGGESTION_RULES: SuggestionRule[] = [
  ...TIME_BASED_RULES,
  ...CONTEXT_BASED_RULES,
  ...PRESENCE_BASED_RULES,
  ...PATTERN_BASED_RULES,
  ...IDLE_BASED_RULES
];
