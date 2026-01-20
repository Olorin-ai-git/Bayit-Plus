/**
 * Conversation Context Hook (Mobile)
 * Tracks conversation state and context for smarter voice command interpretation
 *
 * Mobile adaptation of shared useConversationContext hook:
 * - Uses React Navigation instead of react-router-dom
 * - Tracks visible content on screen
 * - Maintains command history for multi-turn conversations
 * - Resolves contextual references ("play that", "show more like this")
 *
 * Features:
 * - Current route/screen tracking
 * - Visible content registration
 * - Last mentioned content tracking
 * - Command history
 * - Search query tracking
 */

import { useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { voiceCommandProcessor } from '@bayit/shared-services';

export interface ConversationContextData {
  currentRoute: string;
  visibleContentIds: string[];
  lastMentionedContentIds: string[];
  commandHistory: string[];
  lastSearchQuery: string;
}

interface UseConversationContextMobileOptions {
  maxHistoryLength?: number;
}

export function useConversationContextMobile(
  options: UseConversationContextMobileOptions = {}
) {
  const { maxHistoryLength = 10 } = options;
  const route = useRoute();

  const [visibleContentIds, setVisibleContentIds] = useState<string[]>([]);
  const [lastMentionedContentIds, setLastMentionedContentIds] = useState<string[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  // Update voice command processor context whenever local state changes
  useEffect(() => {
    voiceCommandProcessor.updateContext({
      currentRoute: route.name,
      visibleContentIds,
      lastMentionedContentIds,
      lastSearchQuery,
    });
  }, [route.name, visibleContentIds, lastMentionedContentIds, lastSearchQuery]);

  /**
   * Register visible content on screen
   * Call this when a list of content items becomes visible
   *
   * Example: When HomeScreen loads and displays featured content
   */
  const registerVisibleContent = (ids: string[]) => {
    console.log('[ConversationContext] Registered visible content:', ids.length);
    setVisibleContentIds(ids);
  };

  /**
   * Track content that was mentioned in conversation
   * Helps interpret "play that one" or "show more like this"
   *
   * Example: After user says "Play Channel 13", mention "channel_13"
   */
  const mentionContent = (ids: string | string[]) => {
    const idArray = Array.isArray(ids) ? ids : [ids];
    setLastMentionedContentIds((prev) => {
      // Keep last 5 mentioned items
      const updated = [...idArray, ...prev].slice(0, 5);
      return updated;
    });
  };

  /**
   * Add command to history
   * Useful for detecting repeated commands or user intent shifts
   */
  const recordCommand = (transcript: string) => {
    console.log('[ConversationContext] Recorded command:', transcript);
    setCommandHistory((prev) => {
      const updated = [transcript, ...prev].slice(0, maxHistoryLength);
      return updated;
    });
  };

  /**
   * Update last search query
   * Helps with "find more like this" or "refine search" commands
   */
  const recordSearchQuery = (query: string) => {
    console.log('[ConversationContext] Recorded search query:', query);
    setLastSearchQuery(query);
  };

  /**
   * Get the first visible content ID
   * Useful for commands like "play this" when user is looking at a specific item
   */
  const getFirstVisibleContentId = (): string | null => {
    return visibleContentIds.length > 0 ? visibleContentIds[0] : null;
  };

  /**
   * Get the last mentioned content ID
   * For "play it again" type commands
   */
  const getLastMentionedContentId = (): string | null => {
    return lastMentionedContentIds.length > 0 ? lastMentionedContentIds[0] : null;
  };

  /**
   * Check if this command was recently issued
   * Used to detect repeated commands
   */
  const wasRecentlyCommandedWith = (keyword: string, withinLastN: number = 3): boolean => {
    return commandHistory
      .slice(0, withinLastN)
      .some((cmd) => cmd.toLowerCase().includes(keyword.toLowerCase()));
  };

  /**
   * Get context for ambiguous commands
   * Returns the best guess about what user is referring to
   *
   * Example:
   * - User: "Play that" → resolves to last mentioned or first visible content
   * - User: "Show more like this" → resolves to last search query
   */
  const resolveContextualReference = (): { contentId?: string; context: string } => {
    // Priority: last mentioned > first visible > last search
    const contentId = getLastMentionedContentId() || getFirstVisibleContentId();

    if (contentId) {
      return {
        contentId,
        context: 'visible_content',
      };
    }

    if (lastSearchQuery) {
      return {
        context: 'search_results',
      };
    }

    return {
      context: 'none',
    };
  };

  /**
   * Clear all conversation context
   * Call when starting a new conversation or user navigates away
   */
  const clear = () => {
    console.log('[ConversationContext] Cleared context');
    setVisibleContentIds([]);
    setLastMentionedContentIds([]);
    setCommandHistory([]);
    setLastSearchQuery('');
  };

  return {
    // State
    currentRoute: route.name,
    visibleContentIds,
    lastMentionedContentIds,
    commandHistory,
    lastSearchQuery,

    // Actions
    registerVisibleContent,
    mentionContent,
    recordCommand,
    recordSearchQuery,
    getFirstVisibleContentId,
    getLastMentionedContentId,
    wasRecentlyCommandedWith,
    resolveContextualReference,
    clear,
  };
}

export default useConversationContextMobile;
