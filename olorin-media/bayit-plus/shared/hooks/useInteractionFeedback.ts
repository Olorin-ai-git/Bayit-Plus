/**
 * Interaction Feedback Hook
 * Provides voice feedback on non-voice interactions in Hybrid mode
 *
 * Examples:
 * - Click movie card: "מפעיל את {title}"
 * - Add to favorites: "{title} נוסף למועדפים"
 * - Navigate page: "עובר ל{page}"
 * - Pause video: "הופסק"
 * - Scroll: (no feedback - too frequent)
 *
 * Only active in Hybrid mode with voice_feedback_enabled = true
 */

import { useCallback } from 'react';
import { useVoiceSettingsStore, VoiceMode } from '../stores/voiceSettingsStore';
import { ttsService } from '../services/ttsService';

interface InteractionFeedbackOptions {
  enabled?: boolean;
  delayMs?: number; // Delay before speaking (ms)
  priority?: 'high' | 'normal' | 'low';
}

// Feedback message templates in Hebrew
const feedbackTemplates = {
  play_content: (title: string) => `מפעיל את ${title}`,
  add_favorite: (title: string) => `הוסיף את ${title} למועדפים`,
  remove_favorite: (title: string) => `הסר את ${title} מהמועדפים`,
  navigate_to: (destination: string) => `עובר ל${destination}`,
  go_back: () => 'חוזר אחורה',
  search: (query: string) => `חפש ${query}`,
  pause: () => 'משהה',
  play: () => 'מפעיל',
  stop: () => 'עוצר',
  add_to_watchlist: (title: string) => `הוסיף את ${title} לרשימת הצפייה`,
  subscribe: () => 'פותח דף מנוי',
  settings_changed: (setting: string) => `שינוי ${setting}`,
  share: (title: string) => `שיתוף ${title}`,
};

export function useInteractionFeedback(
  options: InteractionFeedbackOptions = {}
) {
  const { enabled = true, delayMs = 100, priority = 'low' } = options;

  const { preferences } = useVoiceSettingsStore();
  const isHybridMode = preferences.voice_mode === VoiceMode.HYBRID;
  const isFeedbackEnabled = preferences.voice_feedback_enabled;
  const shouldGiveFeedback = enabled && isHybridMode && isFeedbackEnabled;

  /**
   * Give feedback for playing content
   */
  const feedbackPlayContent = useCallback(
    (title: string) => {
      if (!shouldGiveFeedback) return;

      const message = feedbackTemplates.play_content(title);
      setTimeout(() => {
        ttsService.speak(message, priority);
      }, delayMs);
    },
    [shouldGiveFeedback, delayMs, priority]
  );

  /**
   * Give feedback for adding to favorites
   */
  const feedbackAddFavorite = useCallback(
    (title: string) => {
      if (!shouldGiveFeedback) return;

      const message = feedbackTemplates.add_favorite(title);
      setTimeout(() => {
        ttsService.speak(message, priority);
      }, delayMs);
    },
    [shouldGiveFeedback, delayMs, priority]
  );

  /**
   * Give feedback for removing from favorites
   */
  const feedbackRemoveFavorite = useCallback(
    (title: string) => {
      if (!shouldGiveFeedback) return;

      const message = feedbackTemplates.remove_favorite(title);
      setTimeout(() => {
        ttsService.speak(message, priority);
      }, delayMs);
    },
    [shouldGiveFeedback, delayMs, priority]
  );

  /**
   * Give feedback for navigation
   */
  const feedbackNavigate = useCallback(
    (destination: string) => {
      if (!shouldGiveFeedback) return;

      const message = feedbackTemplates.navigate_to(destination);
      setTimeout(() => {
        ttsService.speak(message, priority);
      }, delayMs);
    },
    [shouldGiveFeedback, delayMs, priority]
  );

  /**
   * Give feedback for going back
   */
  const feedbackGoBack = useCallback(() => {
    if (!shouldGiveFeedback) return;

    const message = feedbackTemplates.go_back();
    setTimeout(() => {
      ttsService.speak(message, priority);
    }, delayMs);
  }, [shouldGiveFeedback, delayMs, priority]);

  /**
   * Give feedback for search
   */
  const feedbackSearch = useCallback(
    (query: string) => {
      if (!shouldGiveFeedback) return;

      const message = feedbackTemplates.search(query);
      setTimeout(() => {
        ttsService.speak(message, priority);
      }, delayMs);
    },
    [shouldGiveFeedback, delayMs, priority]
  );

  /**
   * Give feedback for playback control
   */
  const feedbackPlayback = useCallback(
    (action: 'pause' | 'play' | 'stop') => {
      if (!shouldGiveFeedback) return;

      const messageMap = {
        pause: feedbackTemplates.pause(),
        play: feedbackTemplates.play(),
        stop: feedbackTemplates.stop(),
      };

      const message = messageMap[action];
      setTimeout(() => {
        ttsService.speak(message, priority);
      }, delayMs);
    },
    [shouldGiveFeedback, delayMs, priority]
  );

  /**
   * Give feedback for adding to watchlist
   */
  const feedbackAddWatchlist = useCallback(
    (title: string) => {
      if (!shouldGiveFeedback) return;

      const message = feedbackTemplates.add_to_watchlist(title);
      setTimeout(() => {
        ttsService.speak(message, priority);
      }, delayMs);
    },
    [shouldGiveFeedback, delayMs, priority]
  );

  /**
   * Give feedback for subscription
   */
  const feedbackSubscribe = useCallback(() => {
    if (!shouldGiveFeedback) return;

    const message = feedbackTemplates.subscribe();
    setTimeout(() => {
      ttsService.speak(message, priority);
    }, delayMs);
  }, [shouldGiveFeedback, delayMs, priority]);

  /**
   * Give feedback for settings change
   */
  const feedbackSettingsChanged = useCallback(
    (setting: string) => {
      if (!shouldGiveFeedback) return;

      const message = feedbackTemplates.settings_changed(setting);
      setTimeout(() => {
        ttsService.speak(message, priority);
      }, delayMs);
    },
    [shouldGiveFeedback, delayMs, priority]
  );

  /**
   * Give feedback for sharing
   */
  const feedbackShare = useCallback(
    (title: string) => {
      if (!shouldGiveFeedback) return;

      const message = feedbackTemplates.share(title);
      setTimeout(() => {
        ttsService.speak(message, priority);
      }, delayMs);
    },
    [shouldGiveFeedback, delayMs, priority]
  );

  /**
   * Generic feedback for custom messages
   */
  const giveFeedback = useCallback(
    (message: string) => {
      if (!shouldGiveFeedback) return;

      setTimeout(() => {
        ttsService.speak(message, priority);
      }, delayMs);
    },
    [shouldGiveFeedback, delayMs, priority]
  );

  return {
    // State
    isFeedbackEnabled: shouldGiveFeedback,
    isHybridMode,

    // Actions
    feedbackPlayContent,
    feedbackAddFavorite,
    feedbackRemoveFavorite,
    feedbackNavigate,
    feedbackGoBack,
    feedbackSearch,
    feedbackPlayback,
    feedbackAddWatchlist,
    feedbackSubscribe,
    feedbackSettingsChanged,
    feedbackShare,
    giveFeedback,
  };
}

export default useInteractionFeedback;
