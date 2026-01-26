/**
 * useConversationContext - Voice Conversation History and Context Hook
 *
 * TV-SPECIFIC HOOK
 *
 * Maintains conversation history for context-aware voice commands:
 * - Last 5 commands for context retention
 * - Timestamp tracking
 * - Success/failure tracking
 * - Multi-turn conversation support
 * - Context clearing on navigation
 *
 * TV SPECIFIC USE CASES:
 * - "Resume [previous content]" - context from last 5 commands
 * - "Like this" - references last played content
 * - "Go back" - references previous navigation
 * - Multi-window context: "Switch to window 2"
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceStore } from '../stores/voiceStore';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useConversationContext');

export interface ConversationEntry {
  id: string;
  command: string;
  timestamp: number;
  success: boolean;
  responseText?: string;
  context?: Record<string, any>;
}

export interface ConversationContextData {
  currentWindow?: number;
  lastPlayedContent?: {
    id: string;
    title: string;
    type: 'live' | 'vod' | 'podcast';
  };
  lastNavigatedScreen?: string;
  lastSearchQuery?: string;
  deviceState?: {
    volumeLevel?: number;
    isPlaying?: boolean;
    currentPosition?: number;
  };
}

export interface UseConversationContextResult {
  history: ConversationEntry[];
  context: ConversationContextData;
  addToHistory: (command: string, success: boolean, response?: string) => void;
  updateContext: (updates: Partial<ConversationContextData>) => void;
  getLastNCommands: (n: number) => ConversationEntry[];
  getLastCommand: () => ConversationEntry | null;
  getContextSummary: () => string;
  clearHistory: () => void;
  clearContext: () => void;
  isContextRelevant: (maxAgeMs?: number) => boolean;
}

/**
 * Hook for managing conversation history and context
 * Enables context-aware voice commands that reference previous interactions
 */
export function useConversationContext(): UseConversationContextResult {
  const voiceStore = useVoiceStore();

  const [history, setHistory] = useState<ConversationEntry[]>([]);
  const [context, setContext] = useState<ConversationContextData>({});

  const historyRef = useRef<ConversationEntry[]>([]);
  const contextRef = useRef<ConversationContextData>({});
  const lastContextUpdateRef = useRef<number>(Date.now());

  // Initialize from voice store's command history
  useEffect(() => {
    const storeHistory = voiceStore.getLastNCommands(5);
    const entries: ConversationEntry[] = storeHistory.map((cmd, index) => ({
      id: `cmd-${Date.now()}-${index}`,
      command: cmd.command,
      timestamp: cmd.timestamp,
      success: cmd.success,
    }));

    setHistory(entries);
    historyRef.current = entries;
  }, [voiceStore]);

  // Add command to history
  const addToHistory = useCallback(
    (command: string, success: boolean, response?: string) => {
      const entry: ConversationEntry = {
        id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        command,
        timestamp: Date.now(),
        success,
        responseText: response,
        context: contextRef.current,
      };

      // Keep last 5 commands
      const updatedHistory = [entry, ...historyRef.current].slice(0, 5);
      setHistory(updatedHistory);
      historyRef.current = updatedHistory;

      // Also update voice store
      voiceStore.addCommandToHistory(command, success);

      moduleLogger.debug('Added to conversation history:', {
        command,
        success,
        historyLength: updatedHistory.length,
      });
    },
    [voiceStore],
  );

  // Update conversation context
  const updateContext = useCallback((updates: Partial<ConversationContextData>) => {
    const updatedContext = {
      ...contextRef.current,
      ...updates,
    };

    setContext(updatedContext);
    contextRef.current = updatedContext;
    lastContextUpdateRef.current = Date.now();

    moduleLogger.debug('Context updated:', updates);
  }, []);

  // Get last N commands
  const getLastNCommands = useCallback((n: number): ConversationEntry[] => {
    return historyRef.current.slice(0, Math.min(n, historyRef.current.length));
  }, []);

  // Get last command
  const getLastCommand = useCallback((): ConversationEntry | null => {
    return historyRef.current.length > 0 ? historyRef.current[0] : null;
  }, []);

  // Generate context summary for API calls
  const getContextSummary = useCallback((): string => {
    const ctx = contextRef.current;
    const parts: string[] = [];

    if (ctx.lastPlayedContent) {
      parts.push(`Last played: ${ctx.lastPlayedContent.title}`);
    }

    if (ctx.lastNavigatedScreen) {
      parts.push(`Last screen: ${ctx.lastNavigatedScreen}`);
    }

    if (ctx.currentWindow) {
      parts.push(`Current window: ${ctx.currentWindow}`);
    }

    if (ctx.lastSearchQuery) {
      parts.push(`Last search: ${ctx.lastSearchQuery}`);
    }

    return parts.join('. ');
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    historyRef.current = [];
    voiceStore.clearCommandHistory();

    moduleLogger.info('Conversation history cleared');
  }, [voiceStore]);

  // Clear context
  const clearContext = useCallback(() => {
    setContext({});
    contextRef.current = {};

    moduleLogger.info('Conversation context cleared');
  }, []);

  // Check if context is still relevant (within certain time window)
  const isContextRelevant = useCallback((maxAgeMs: number = 600000): boolean => {
    const age = Date.now() - lastContextUpdateRef.current;
    const isRelevant = age < maxAgeMs && Object.keys(contextRef.current).length > 0;

    return isRelevant;
  }, []);

  return {
    history,
    context,
    addToHistory,
    updateContext,
    getLastNCommands,
    getLastCommand,
    getContextSummary,
    clearHistory,
    clearContext,
    isContextRelevant,
  };
}
