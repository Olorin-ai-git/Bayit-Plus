/**
 * Proactive Agent Service
 * Generates context-aware suggestions and proactive greetings based on real user data
 *
 * Features:
 * - Welcome back greetings with content resume suggestions
 * - Time-aware suggestions (morning, afternoon, evening, night)
 * - Content recommendations based on viewing history
 * - Frustration detection and adaptive suggestions
 * - All recommendations based on REAL user data from backend
 *
 * NO MOCK DATA - Only real viewing history, preferences, and trending content
 */

export interface ContentItem {
  id: string;
  title: string;
  thumbnail: string;
  progress?: number; // 0-1 (0% to 100%)
  lastWatchedDate?: string;
}

export interface UserContext {
  lastWatchedContent: ContentItem | null;
  lastWatchedDate: Date | null;
  watchProgress: number; // 0-1 for incomplete content
  incompleteContent: ContentItem[]; // Content user hasn't finished
  favorites: ContentItem[];
  viewingHistory: ContentItem[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  lastInteractionTime: Date;
  timeSinceLastView: number; // milliseconds
}

export interface ProactiveMessage {
  greeting: string;
  suggestion?: string;
  contentId?: string;
  intent: 'resume' | 'newContent' | 'welcome' | 'suggestion';
  confidence: number; // 0-1 how confident we are in this suggestion
}

class ProactiveAgentService {
  /**
   * Generate a greeting message based on time of day and user context
   * Only uses REAL user data from backend
   */
  async generateGreeting(userContext: UserContext): Promise<ProactiveMessage | null> {
    // No greeting if we don't have real data
    if (!userContext.viewingHistory || userContext.viewingHistory.length === 0) {
      return null;
    }

    const timeGreeting = this.getTimeBasedGreeting(userContext.timeOfDay);

    // Priority 1: User has incomplete content they were watching
    if (userContext.lastWatchedContent && userContext.watchProgress > 0 && userContext.watchProgress < 0.95) {
      return {
        greeting: `${timeGreeting} ברוך הבא! רוצה להמשיך לצפות ב${userContext.lastWatchedContent.title}?`,
        suggestion: `המשך מ${Math.round(userContext.watchProgress * 100)}%`,
        contentId: userContext.lastWatchedContent.id,
        intent: 'resume',
        confidence: 0.95,
      };
    }

    // Priority 2: Recently finished content - suggest next season/similar
    if (userContext.lastWatchedContent && userContext.watchProgress >= 0.9) {
      return {
        greeting: `${timeGreeting}! סיימת את ${userContext.lastWatchedContent.title}. רוצה משהו דומה?`,
        suggestion: 'חפש משהו דומה',
        intent: 'suggestion',
        confidence: 0.75,
      };
    }

    // Priority 3: Time-based suggestion (morning = news, evening = series, etc.)
    const timeSuggestion = this.getTimeBasedSuggestion(userContext.timeOfDay);
    if (timeSuggestion) {
      return {
        greeting: `${timeGreeting}! ${timeSuggestion.greeting}`,
        suggestion: timeSuggestion.suggestion,
        intent: 'newContent',
        confidence: 0.65,
      };
    }

    // Default: Simple welcome
    return {
      greeting: `${timeGreeting}! יש לנו עבורך סיפור נפלא`,
      suggestion: 'כיצד אוכל לעזור לך?',
      intent: 'welcome',
      confidence: 0.5,
    };
  }

  /**
   * Get time-appropriate greeting
   */
  private getTimeBasedGreeting(timeOfDay: string): string {
    switch (timeOfDay) {
      case 'morning':
        return 'בוקר טוב!';
      case 'afternoon':
        return 'צהריים טובים!';
      case 'evening':
        return 'ערב טוב!';
      case 'night':
        return 'לילה טוב!';
      default:
        return 'שלום!';
    }
  }

  /**
   * Get time-appropriate content suggestion
   */
  private getTimeBasedSuggestion(
    timeOfDay: string
  ): { greeting: string; suggestion: string } | null {
    switch (timeOfDay) {
      case 'morning':
        return {
          greeting: 'בדקת את החדשות או הסדרה שלך?',
          suggestion: 'הצג עדכונים חדשים',
        };
      case 'afternoon':
        return {
          greeting: 'זמן לפסקת בהות?',
          suggestion: 'הצג תוכן פופולרי',
        };
      case 'evening':
        return {
          greeting: 'מוכן לערב בילוי?',
          suggestion: 'הצג סדרות חדשות',
        };
      case 'night':
        return {
          greeting: 'משהו קל להרגעה?',
          suggestion: 'הצג קומדיה או דרמה',
        };
      default:
        return null;
    }
  }

  /**
   * Determine time of day based on hour
   */
  getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Get current day of week in Hebrew
   */
  getDayOfWeek(): string {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days[new Date().getDay()];
  }

  /**
   * Should we show a proactive suggestion?
   * Based on time since last interaction and user engagement
   */
  shouldShowProactiveSuggestion(userContext: UserContext): boolean {
    // Don't bombard user with suggestions - show max once per 30 minutes
    const thirtyMinutes = 30 * 60 * 1000;
    if (userContext.timeSinceLastView < thirtyMinutes) {
      return false;
    }

    // Show proactive suggestions if user has viewing history
    if (!userContext.viewingHistory || userContext.viewingHistory.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Get all incomplete content for resume suggestions
   * Returns content sorted by last watched date (most recent first)
   */
  getIncompleteContent(userContext: UserContext): ContentItem[] {
    if (!userContext.incompleteContent) {
      return [];
    }

    // Filter to content that's 5-90% watched (not too new, not almost finished)
    return userContext.incompleteContent
      .filter((item) => item.progress && item.progress > 0.05 && item.progress < 0.9)
      .sort((a, b) => {
        const dateA = new Date(a.lastWatchedDate || 0).getTime();
        const dateB = new Date(b.lastWatchedDate || 0).getTime();
        return dateB - dateA;
      });
  }

  /**
   * Format time difference for display (e.g., "2 days ago")
   */
  formatTimeDifference(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'זה עתה';
    if (minutes < 60) return `לפני ${minutes} דקות`;
    if (hours < 24) return `לפני ${hours} שעות`;
    if (days < 7) return `לפני ${days} ימים`;
    if (days < 30) return `לפני ${Math.floor(days / 7)} שבועות`;
    return `לפני ${Math.floor(days / 30)} חודשים`;
  }

  /**
   * Generate contextual suggestion based on user activity
   */
  async generateContextualSuggestion(userContext: UserContext): Promise<string | null> {
    // If user was watching something, suggest continuing or finding similar
    if (userContext.lastWatchedContent && userContext.watchProgress > 0) {
      if (userContext.watchProgress < 0.5) {
        return `בואו נחזור ל${userContext.lastWatchedContent.title}`;
      } else if (userContext.watchProgress < 0.9) {
        return `כמעט סיימת את ${userContext.lastWatchedContent.title} - רוצה להמשיך?`;
      }
    }

    // If user has favorites, suggest browsing them
    if (userContext.favorites && userContext.favorites.length > 0) {
      return 'רוצה לחקור את המועדפים שלך?';
    }

    // If user has viewing history, suggest based on patterns
    if (userContext.viewingHistory && userContext.viewingHistory.length > 5) {
      return 'יש לנו תוכן חדש שאתה עשוי לאהוב';
    }

    return null;
  }
}

export const proactiveAgentService = new ProactiveAgentService();
export default proactiveAgentService;
