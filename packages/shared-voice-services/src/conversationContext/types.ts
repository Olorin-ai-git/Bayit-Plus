/**
 * Conversation Context Types
 * Type definitions for conversation context management
 */

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ConversationTurn {
  userMessage: ConversationMessage;
  assistantMessage?: ConversationMessage;
  success: boolean;
  frustrationLevel?: number;
}

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  turns: ConversationTurn[];
  startTime: number;
  lastActivityTime: number;
  metadata: Record<string, unknown>;
}

export interface ConversationSummary {
  totalTurns: number;
  successRate: number;
  averageFrustration: number;
  duration: number;
  topicsDiscussed: string[];
  mostCommonIntents: string[];
}

export interface ContextManagerConfig {
  maxTurns: number;
  sessionTimeout: number;
  enableAutoSummarization: boolean;
  persistContext: boolean;
}
