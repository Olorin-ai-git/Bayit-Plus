/**
 * Types for useConversationContext Hook
 *
 * Voice conversation history and context types for tvOS,
 * supporting multi-turn conversations and context-aware commands.
 */

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
