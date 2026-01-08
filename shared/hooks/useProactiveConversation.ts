/**
 * Proactive Conversation Hook
 * Integrates proactive agent service with emotional intelligence for adaptive responses
 *
 * Provides:
 * - Proactive greetings on app launch
 * - Adaptive responses based on user frustration
 * - Context-aware suggestions
 * - Handling of repeated commands with alternatives
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { proactiveAgentService, ProactiveMessage, UserContext } from '../services/proactiveAgentService';
import { emotionalIntelligenceService, VoiceAnalysis } from '../services/emotionalIntelligenceService';

interface UseProactiveConversationOptions {
  onGreeting?: (greeting: ProactiveMessage) => void;
  onAdaptiveResponse?: (response: string, analysis: VoiceAnalysis) => void;
  onHelpNeeded?: (suggestion: string) => void;
}

export function useProactiveConversation(
  options: UseProactiveConversationOptions = {}
) {
  const { onGreeting, onAdaptiveResponse, onHelpNeeded } = options;

  const commandHistoryRef = useRef<string[]>([]);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize conversation tracking
  useEffect(() => {
    // In a real app, this would fetch user context from backend
    // For now, we'll have it available for when the backend provides it
    setIsReady(true);
  }, []);

  /**
   * Set user context from backend data
   * Should be called when user data is loaded
   */
  const setUserContextFromBackend = useCallback(
    (data: {
      lastWatchedContent?: { id: string; title: string; thumbnail: string; progress?: number };
      lastWatchedDate?: string;
      incompleteContent?: Array<{ id: string; title: string; thumbnail: string; progress?: number }>;
      favorites?: Array<{ id: string; title: string; thumbnail: string }>;
      viewingHistory?: Array<{ id: string; title: string; thumbnail: string }>;
    }) => {
      const context: UserContext = {
        lastWatchedContent: data.lastWatchedContent || null,
        lastWatchedDate: data.lastWatchedDate ? new Date(data.lastWatchedDate) : null,
        watchProgress: data.lastWatchedContent?.progress || 0,
        incompleteContent: data.incompleteContent || [],
        favorites: data.favorites || [],
        viewingHistory: data.viewingHistory || [],
        timeOfDay: proactiveAgentService.getTimeOfDay(),
        dayOfWeek: proactiveAgentService.getDayOfWeek(),
        lastInteractionTime: new Date(),
        timeSinceLastView: 0,
      };

      setUserContext(context);
    },
    []
  );

  /**
   * Generate a greeting on app launch or return from pause
   * Only uses REAL user data
   */
  const generateGreeting = useCallback(async (): Promise<ProactiveMessage | null> => {
    if (!userContext) return null;

    const greeting = await proactiveAgentService.generateGreeting(userContext);

    if (greeting && onGreeting) {
      onGreeting(greeting);
    }

    return greeting;
  }, [userContext, onGreeting]);

  /**
   * Process user input and generate adaptive response
   * Analyzes frustration level and adjusts tone accordingly
   */
  const processUserInput = useCallback(
    (transcript: string, baseResponse: string) => {
      // Update command history
      commandHistoryRef.current = [transcript, ...commandHistoryRef.current].slice(0, 10);

      // Analyze voice pattern for emotional state
      const analysis = emotionalIntelligenceService.analyzeVoicePattern(
        transcript,
        commandHistoryRef.current.slice(1) // Exclude current command
      );

      // Check if user needs help
      const needsHelp = emotionalIntelligenceService.shouldOfferHelp(analysis, commandHistoryRef.current);
      if (needsHelp && onHelpNeeded) {
        const helpSuggestion = emotionalIntelligenceService.generateHelpSuggestion(analysis);
        onHelpNeeded(helpSuggestion);
      }

      // Generate adaptive response based on frustration level
      const adaptiveResponse = emotionalIntelligenceService.generateAdaptiveResponse(
        baseResponse,
        analysis.frustrationLevel
      );

      if (onAdaptiveResponse) {
        onAdaptiveResponse(adaptiveResponse, analysis);
      }

      return {
        adaptiveResponse,
        analysis,
        toneAdjustment: emotionalIntelligenceService.getToneAdjustment(analysis.frustrationLevel),
      };
    },
    [onAdaptiveResponse, onHelpNeeded]
  );

  /**
   * Get suggested alternatives when user is frustrated
   */
  const getSuggestedAlternatives = useCallback(
    (
      intent: string,
      currentSuggestion?: string
    ): {
      primary: string;
      alternatives: string[];
    } => {
      const alternatives: string[] = [];

      // Map intent to alternative suggestions
      switch (intent.toLowerCase()) {
        case 'search':
          alternatives.push(
            'חפש לפי קטגוריה',
            'הצג טרנדים',
            'הצע בהתאם להיסטוריה שלך',
            'חפש לפי סוג'
          );
          break;

        case 'navigation':
          alternatives.push(
            'חזור לעמוד הבית',
            'צפה במועדפים',
            'צפה בהמלצות',
            'חפש תוכן'
          );
          break;

        case 'playback':
          alternatives.push(
            'המשך מהנקודה האחרונה',
            'התחל מהתחלה',
            'עבור לתוכן אחר'
          );
          break;

        default:
          alternatives.push(
            'עזור לי',
            'כיצד לנווט',
            'תן לי הוראות'
          );
      }

      return {
        primary: currentSuggestion || 'בוא נחפש משהו אחר',
        alternatives,
      };
    },
    []
  );

  /**
   * Update user context after interaction
   * Called when viewing history or preferences change
   */
  const updateContextAfterInteraction = useCallback(
    (data: Partial<UserContext>) => {
      if (!userContext) return;

      setUserContext((prev) => ({
        ...prev!,
        ...data,
        lastInteractionTime: new Date(),
        timeSinceLastView: Date.now() - (data.lastWatchedDate ? new Date(data.lastWatchedDate).getTime() : 0),
      }));
    },
    [userContext]
  );

  /**
   * Clear conversation history
   * Call when starting new conversation or user logs out
   */
  const clearHistory = useCallback(() => {
    commandHistoryRef.current = [];
  }, []);

  return {
    // State
    isReady,
    userContext,

    // Actions
    setUserContextFromBackend,
    generateGreeting,
    processUserInput,
    getSuggestedAlternatives,
    updateContextAfterInteraction,
    clearHistory,

    // Utilities
    getCommandHistory: () => commandHistoryRef.current,
  };
}

export default useProactiveConversation;
