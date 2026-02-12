/**
 * Conversation Context Manager Tests
 */

import { ConversationContextManager } from '../ConversationContextManager';

describe('ConversationContextManager', () => {
  let manager: ConversationContextManager;

  beforeEach(() => {
    manager = new ConversationContextManager({
      maxTurns: 100,
      sessionTimeout: 30 * 60 * 1000,
      enableAutoSummarization: true,
      persistContext: true
    });
  });

  describe('context management', () => {
    it('should create new context for session', () => {
      const context = manager.getContext('session-1', 'user-1');

      expect(context.sessionId).toBe('session-1');
      expect(context.userId).toBe('user-1');
      expect(context.turns).toHaveLength(0);
      expect(context.startTime).toBeDefined();
    });

    it('should reuse existing context', () => {
      const context1 = manager.getContext('session-1');
      const context2 = manager.getContext('session-1');

      expect(context1).toBe(context2);
    });

    it('should clear context for session', () => {
      manager.getContext('session-1');
      manager.clearContext('session-1');

      const context = manager.getContext('session-1');
      expect(context.turns).toHaveLength(0);
    });
  });

  describe('conversation turns', () => {
    it('should add user message', () => {
      manager.addUserMessage('session-1', 'Search for movies');

      const turns = manager.getTurns('session-1');
      expect(turns).toHaveLength(1);
      expect(turns[0].userMessage.content).toBe('Search for movies');
      expect(turns[0].userMessage.role).toBe('user');
    });

    it('should add assistant message', () => {
      manager.addUserMessage('session-1', 'Search for movies');
      manager.addAssistantMessage(
        'session-1',
        'Here are some movies',
        true,
        0.2
      );

      const turns = manager.getTurns('session-1');
      expect(turns).toHaveLength(1);
      expect(turns[0].assistantMessage?.content).toBe('Here are some movies');
      expect(turns[0].assistantMessage?.role).toBe('assistant');
      expect(turns[0].success).toBe(true);
      expect(turns[0].frustrationLevel).toBe(0.2);
    });

    it('should throw error when adding assistant message without user message', () => {
      expect(() => {
        manager.addAssistantMessage('session-1', 'Response');
      }).toThrow('No user message to respond to');
    });

    it('should handle multiple turns', () => {
      manager.addUserMessage('session-1', 'Message 1');
      manager.addAssistantMessage('session-1', 'Response 1', true);

      manager.addUserMessage('session-1', 'Message 2');
      manager.addAssistantMessage('session-1', 'Response 2', true);

      const turns = manager.getTurns('session-1');
      expect(turns).toHaveLength(2);
    });

    it('should get limited number of turns', () => {
      for (let i = 1; i <= 10; i++) {
        manager.addUserMessage('session-1', `Message ${i}`);
        manager.addAssistantMessage('session-1', `Response ${i}`, true);
      }

      const recentTurns = manager.getTurns('session-1', 3);
      expect(recentTurns).toHaveLength(3);
      expect(recentTurns[0].userMessage.content).toBe('Message 8');
    });
  });

  describe('message retrieval', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        manager.addUserMessage('session-1', `User message ${i}`);
        manager.addAssistantMessage('session-1', `Assistant response ${i}`, i % 2 === 0);
      }
    });

    it('should get recent user messages', () => {
      const messages = manager.getRecentUserMessages('session-1', 3);

      expect(messages).toHaveLength(3);
      expect(messages[0]).toBe('User message 3');
      expect(messages[2]).toBe('User message 5');
    });

    it('should get success history', () => {
      const successHistory = manager.getSuccessHistory('session-1');

      expect(successHistory).toHaveLength(5);
      expect(successHistory[0]).toBe(false); // i=1
      expect(successHistory[1]).toBe(true);  // i=2
      expect(successHistory[2]).toBe(false); // i=3
      expect(successHistory[3]).toBe(true);  // i=4
      expect(successHistory[4]).toBe(false); // i=5
    });

    it('should get limited success history', () => {
      const successHistory = manager.getSuccessHistory('session-1', 2);

      expect(successHistory).toHaveLength(2);
    });

    it('should return empty arrays for non-existent session', () => {
      const messages = manager.getRecentUserMessages('non-existent');
      const successHistory = manager.getSuccessHistory('non-existent');

      expect(messages).toHaveLength(0);
      expect(successHistory).toHaveLength(0);
    });
  });

  describe('conversation summary', () => {
    it('should generate summary with metrics', () => {
      for (let i = 1; i <= 10; i++) {
        manager.addUserMessage('session-1', `Message ${i}`);
        manager.addAssistantMessage(
          'session-1',
          `Response ${i}`,
          i % 3 !== 0, // Success: true, true, false, true, true, false...
          i * 0.1 // Frustration increases
        );
      }

      const summary = manager.getSummary('session-1');

      expect(summary).toBeDefined();
      expect(summary!.totalTurns).toBe(10);
      expect(summary!.successRate).toBeCloseTo(0.7, 1); // 7/10 successful
      expect(summary!.averageFrustration).toBeGreaterThan(0);
      expect(summary!.duration).toBeGreaterThan(0);
    });

    it('should extract topics from conversation', () => {
      manager.addUserMessage('session-1', 'Show me a movie');
      manager.addAssistantMessage('session-1', 'Here are movies', true);

      manager.addUserMessage('session-1', 'Find a series');
      manager.addAssistantMessage('session-1', 'Here are series', true);

      const summary = manager.getSummary('session-1');

      expect(summary!.topicsDiscussed).toContain('movie');
      expect(summary!.topicsDiscussed).toContain('series');
    });

    it('should return null for non-existent session', () => {
      const summary = manager.getSummary('non-existent');
      expect(summary).toBeNull();
    });

    it('should return null for session with no turns', () => {
      manager.getContext('session-1');
      const summary = manager.getSummary('session-1');
      expect(summary).toBeNull();
    });
  });

  describe('metadata management', () => {
    it('should update session metadata', () => {
      manager.updateMetadata('session-1', { platform: 'web', version: '1.0' });

      const metadata = manager.getMetadata('session-1');
      expect(metadata.platform).toBe('web');
      expect(metadata.version).toBe('1.0');
    });

    it('should merge metadata', () => {
      manager.updateMetadata('session-1', { key1: 'value1' });
      manager.updateMetadata('session-1', { key2: 'value2' });

      const metadata = manager.getMetadata('session-1');
      expect(metadata.key1).toBe('value1');
      expect(metadata.key2).toBe('value2');
    });

    it('should return empty object for non-existent session', () => {
      const metadata = manager.getMetadata('non-existent');
      expect(metadata).toEqual({});
    });
  });

  describe('session cleanup', () => {
    it('should clear expired contexts', async () => {
      const shortTimeoutManager = new ConversationContextManager({
        sessionTimeout: 100 // 100ms
      });

      shortTimeoutManager.addUserMessage('session-1', 'Message 1');
      shortTimeoutManager.addUserMessage('session-2', 'Message 2');

      await new Promise(resolve => setTimeout(resolve, 150));

      const cleared = shortTimeoutManager.clearExpiredContexts();
      expect(cleared).toBe(2);
    });

    it('should not clear active contexts', () => {
      manager.addUserMessage('session-1', 'Recent message');

      const cleared = manager.clearExpiredContexts();
      expect(cleared).toBe(0);
    });

    it('should get active session count', () => {
      manager.getContext('session-1');
      manager.getContext('session-2');
      manager.getContext('session-3');

      const count = manager.getActiveSessionCount();
      expect(count).toBe(3);
    });
  });

  describe('context trimming', () => {
    it('should trim context when max turns exceeded', () => {
      const smallManager = new ConversationContextManager({ maxTurns: 5 });

      for (let i = 1; i <= 10; i++) {
        smallManager.addUserMessage('session-1', `Message ${i}`);
        smallManager.addAssistantMessage('session-1', `Response ${i}`, true);
      }

      const turns = smallManager.getTurns('session-1');
      expect(turns).toHaveLength(5);
      expect(turns[0].userMessage.content).toBe('Message 6');
      expect(turns[4].userMessage.content).toBe('Message 10');
    });
  });

  describe('message metadata', () => {
    it('should store message metadata', () => {
      manager.addUserMessage('session-1', 'Search', {
        intent: 'search',
        confidence: 0.95
      });

      manager.addAssistantMessage('session-1', 'Results', true, 0.1, {
        resultCount: 10
      });

      const turns = manager.getTurns('session-1');
      expect(turns[0].userMessage.metadata?.intent).toBe('search');
      expect(turns[0].userMessage.metadata?.confidence).toBe(0.95);
      expect(turns[0].assistantMessage?.metadata?.resultCount).toBe(10);
    });
  });
});
