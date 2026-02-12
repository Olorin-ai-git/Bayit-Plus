/**
 * Conversation Context Manager
 * Manages conversation state and context
 */

import type {
  ConversationMessage,
  ConversationTurn,
  ConversationContext,
  ConversationSummary,
  ContextManagerConfig
} from './types';

export class ConversationContextManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private config: ContextManagerConfig;

  constructor(config: Partial<ContextManagerConfig> = {}) {
    this.config = {
      maxTurns: config.maxTurns || 100,
      sessionTimeout: config.sessionTimeout || 30 * 60 * 1000, // 30 minutes
      enableAutoSummarization: config.enableAutoSummarization ?? true,
      persistContext: config.persistContext ?? true
    };
  }

  /**
   * Create or get conversation context
   */
  getContext(sessionId: string, userId?: string): ConversationContext {
    let context = this.contexts.get(sessionId);

    if (!context) {
      context = {
        sessionId,
        userId,
        turns: [],
        startTime: Date.now(),
        lastActivityTime: Date.now(),
        metadata: {}
      };
      this.contexts.set(sessionId, context);
    }

    return context;
  }

  /**
   * Add user message to context
   */
  addUserMessage(
    sessionId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): void {
    const context = this.getContext(sessionId);

    const userMessage: ConversationMessage = {
      role: 'user',
      content,
      timestamp: Date.now(),
      metadata
    };

    const turn: ConversationTurn = {
      userMessage,
      success: false
    };

    context.turns.push(turn);
    context.lastActivityTime = Date.now();

    this.trimContextIfNeeded(context);
  }

  /**
   * Add assistant response to context
   */
  addAssistantMessage(
    sessionId: string,
    content: string,
    success: boolean = true,
    frustrationLevel?: number,
    metadata?: Record<string, unknown>
  ): void {
    const context = this.getContext(sessionId);

    if (context.turns.length === 0) {
      throw new Error('No user message to respond to');
    }

    const currentTurn = context.turns[context.turns.length - 1];

    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      content,
      timestamp: Date.now(),
      metadata
    };

    currentTurn.assistantMessage = assistantMessage;
    currentTurn.success = success;
    currentTurn.frustrationLevel = frustrationLevel;

    context.lastActivityTime = Date.now();
  }

  /**
   * Get conversation turns
   */
  getTurns(sessionId: string, count?: number): ConversationTurn[] {
    const context = this.contexts.get(sessionId);
    if (!context) return [];

    if (count === undefined) {
      return [...context.turns];
    }

    return context.turns.slice(-count);
  }

  /**
   * Get recent user messages
   */
  getRecentUserMessages(sessionId: string, count: number = 10): string[] {
    const context = this.contexts.get(sessionId);
    if (!context) return [];

    return context.turns
      .slice(-count)
      .map(turn => turn.userMessage.content);
  }

  /**
   * Get success history
   */
  getSuccessHistory(sessionId: string, count?: number): boolean[] {
    const context = this.contexts.get(sessionId);
    if (!context) return [];

    const turns = count ? context.turns.slice(-count) : context.turns;
    return turns.map(turn => turn.success);
  }

  /**
   * Get conversation summary
   */
  getSummary(sessionId: string): ConversationSummary | null {
    const context = this.contexts.get(sessionId);
    if (!context || context.turns.length === 0) return null;

    const totalTurns = context.turns.length;
    const successfulTurns = context.turns.filter(turn => turn.success).length;
    const successRate = successfulTurns / totalTurns;

    const frustrationLevels = context.turns
      .map(turn => turn.frustrationLevel)
      .filter((level): level is number => level !== undefined);

    const averageFrustration = frustrationLevels.length > 0
      ? frustrationLevels.reduce((sum, level) => sum + level, 0) / frustrationLevels.length
      : 0;

    const duration = context.lastActivityTime - context.startTime;

    // Extract topics (simplified keyword extraction)
    const topicsDiscussed = this.extractTopics(context);

    // Extract most common intents
    const mostCommonIntents = this.extractIntents(context);

    return {
      totalTurns,
      successRate,
      averageFrustration,
      duration,
      topicsDiscussed,
      mostCommonIntents
    };
  }

  /**
   * Clear context for a session
   */
  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
  }

  /**
   * Clear all expired contexts
   */
  clearExpiredContexts(): number {
    const now = Date.now();
    let clearedCount = 0;

    for (const [sessionId, context] of this.contexts.entries()) {
      if (now - context.lastActivityTime > this.config.sessionTimeout) {
        this.contexts.delete(sessionId);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.contexts.size;
  }

  /**
   * Update session metadata
   */
  updateMetadata(
    sessionId: string,
    metadata: Record<string, unknown>
  ): void {
    const context = this.getContext(sessionId);
    context.metadata = { ...context.metadata, ...metadata };
  }

  /**
   * Get session metadata
   */
  getMetadata(sessionId: string): Record<string, unknown> {
    const context = this.contexts.get(sessionId);
    return context ? { ...context.metadata } : {};
  }

  /**
   * Trim context if it exceeds max turns
   */
  private trimContextIfNeeded(context: ConversationContext): void {
    if (context.turns.length > this.config.maxTurns) {
      context.turns = context.turns.slice(-this.config.maxTurns);
    }
  }

  /**
   * Extract topics from conversation
   */
  private extractTopics(context: ConversationContext): string[] {
    const keywords = new Set<string>();
    const contentTypes = ['movie', 'series', 'podcast', 'audiobook', 'radio'];

    for (const turn of context.turns) {
      const content = turn.userMessage.content.toLowerCase();

      for (const type of contentTypes) {
        if (content.includes(type)) {
          keywords.add(type);
        }
      }
    }

    return Array.from(keywords);
  }

  /**
   * Extract most common intents
   */
  private extractIntents(context: ConversationContext): string[] {
    const intentCounts = new Map<string, number>();

    for (const turn of context.turns) {
      const metadata = turn.userMessage.metadata;
      if (metadata && typeof metadata.intent === 'string') {
        const count = intentCounts.get(metadata.intent) || 0;
        intentCounts.set(metadata.intent, count + 1);
      }
    }

    return Array.from(intentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([intent]) => intent);
  }
}

// Singleton instance
export const conversationContextManager = new ConversationContextManager();
