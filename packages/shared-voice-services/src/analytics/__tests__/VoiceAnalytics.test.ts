/**
 * Voice Analytics Tests
 */

import { VoiceAnalytics } from '../VoiceAnalytics';
import type { VoiceEvent } from '../types';

describe('VoiceAnalytics', () => {
  let analytics: VoiceAnalytics;

  beforeEach(() => {
    analytics = new VoiceAnalytics({
      enableTracking: true,
      enablePerformanceMetrics: true,
      sampleRate: 1.0,
      batchSize: 50
    });
  });

  describe('event tracking', () => {
    it('should track voice events', () => {
      analytics.trackEvent('command_received', 'session-1', {
        transcript: 'search for movies'
      });

      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('command_received');
      expect(events[0].sessionId).toBe('session-1');
      expect(events[0].data.transcript).toBe('search for movies');
    });

    it('should not track when disabled', () => {
      const disabledAnalytics = new VoiceAnalytics({ enableTracking: false });

      disabledAnalytics.trackEvent('command_received', 'session-1');

      const events = disabledAnalytics.getEvents();
      expect(events).toHaveLength(0);
    });

    it('should respect sample rate', () => {
      const sampledAnalytics = new VoiceAnalytics({ sampleRate: 0.0 });

      for (let i = 0; i < 100; i++) {
        sampledAnalytics.trackEvent('command_received', 'session-1');
      }

      const events = sampledAnalytics.getEvents();
      expect(events).toHaveLength(0);
    });

    it('should trim events when batch size exceeded', () => {
      const smallAnalytics = new VoiceAnalytics({ batchSize: 5 });

      for (let i = 0; i < 15; i++) {
        smallAnalytics.trackEvent('command_received', 'session-1');
      }

      const events = smallAnalytics.getEvents();
      expect(events.length).toBeLessThanOrEqual(10); // batchSize * 2
    });
  });

  describe('session tracking', () => {
    it('should start and end session', () => {
      analytics.startSession('session-1', 'user-1');

      const metrics = analytics.getSessionMetrics('session-1');
      expect(metrics).toBeDefined();
      expect(metrics!.sessionId).toBe('session-1');
      expect(metrics!.userId).toBe('user-1');
      expect(metrics!.totalCommands).toBe(0);

      const endedMetrics = analytics.endSession('session-1');
      expect(endedMetrics).toBeDefined();
      expect(endedMetrics!.endTime).toBeDefined();
      expect(endedMetrics!.duration).toBeGreaterThan(0);
    });

    it('should return null for non-existent session', () => {
      const metrics = analytics.getSessionMetrics('non-existent');
      expect(metrics).toBeNull();

      const endedMetrics = analytics.endSession('non-existent');
      expect(endedMetrics).toBeNull();
    });

    it('should get all session metrics', () => {
      analytics.startSession('session-1');
      analytics.startSession('session-2');
      analytics.startSession('session-3');

      const allMetrics = analytics.getAllSessionMetrics();
      expect(allMetrics).toHaveLength(3);
    });
  });

  describe('command tracking', () => {
    beforeEach(() => {
      analytics.startSession('session-1');
    });

    it('should track successful commands', () => {
      analytics.trackCommand('session-1', 'search', true, 0.95, 0.2, 'en-US');

      const metrics = analytics.getSessionMetrics('session-1');
      expect(metrics!.totalCommands).toBe(1);
      expect(metrics!.successfulCommands).toBe(1);
      expect(metrics!.failedCommands).toBe(0);
      expect(metrics!.successRate).toBe(1.0);
    });

    it('should track failed commands', () => {
      analytics.trackCommand('session-1', 'search', false, 0.6, 0.8, 'en-US');

      const metrics = analytics.getSessionMetrics('session-1');
      expect(metrics!.totalCommands).toBe(1);
      expect(metrics!.successfulCommands).toBe(0);
      expect(metrics!.failedCommands).toBe(1);
      expect(metrics!.successRate).toBe(0.0);
    });

    it('should calculate success rate', () => {
      analytics.trackCommand('session-1', 'search', true, 0.9, 0.2);
      analytics.trackCommand('session-1', 'play', true, 0.85, 0.3);
      analytics.trackCommand('session-1', 'navigate', false, 0.7, 0.6);

      const metrics = analytics.getSessionMetrics('session-1');
      expect(metrics!.successRate).toBeCloseTo(2/3, 2);
    });

    it('should calculate average confidence', () => {
      analytics.trackCommand('session-1', 'search', true, 0.9, 0.2);
      analytics.trackCommand('session-1', 'play', true, 0.8, 0.2);

      const metrics = analytics.getSessionMetrics('session-1');
      expect(metrics!.averageConfidence).toBeCloseTo(0.85, 2);
    });

    it('should calculate average frustration', () => {
      analytics.trackCommand('session-1', 'search', true, 0.9, 0.3);
      analytics.trackCommand('session-1', 'play', true, 0.9, 0.5);

      const metrics = analytics.getSessionMetrics('session-1');
      expect(metrics!.averageFrustration).toBeCloseTo(0.4, 2);
    });

    it('should track languages used', () => {
      analytics.trackCommand('session-1', 'search', true, 0.9, 0.2, 'en-US');
      analytics.trackCommand('session-1', 'play', true, 0.9, 0.2, 'he-IL');

      const metrics = analytics.getSessionMetrics('session-1');
      expect(metrics!.languagesUsed).toContain('en-US');
      expect(metrics!.languagesUsed).toContain('he-IL');
    });
  });

  describe('intent usage tracking', () => {
    beforeEach(() => {
      analytics.startSession('session-1');
    });

    it('should track intent usage', () => {
      analytics.trackCommand('session-1', 'search', true, 0.9, 0.2);
      analytics.trackCommand('session-1', 'search', true, 0.9, 0.2);
      analytics.trackCommand('session-1', 'play', false, 0.8, 0.5);

      const metrics = analytics.getSessionMetrics('session-1');
      expect(metrics!.mostUsedIntents).toHaveLength(2);

      const searchIntent = metrics!.mostUsedIntents.find(i => i.intent === 'search');
      expect(searchIntent!.count).toBe(2);
      expect(searchIntent!.successRate).toBe(1.0);

      const playIntent = metrics!.mostUsedIntents.find(i => i.intent === 'play');
      expect(playIntent!.count).toBe(1);
      expect(playIntent!.successRate).toBe(0.0);
    });

    it('should sort intents by usage count', () => {
      analytics.trackCommand('session-1', 'search', true, 0.9, 0.2);
      analytics.trackCommand('session-1', 'play', true, 0.9, 0.2);
      analytics.trackCommand('session-1', 'play', true, 0.9, 0.2);

      const metrics = analytics.getSessionMetrics('session-1');
      expect(metrics!.mostUsedIntents[0].intent).toBe('play');
      expect(metrics!.mostUsedIntents[1].intent).toBe('search');
    });

    it('should limit to top 10 intents', () => {
      for (let i = 1; i <= 15; i++) {
        analytics.trackCommand('session-1', `intent-${i}`, true, 0.9, 0.2);
      }

      const metrics = analytics.getSessionMetrics('session-1');
      expect(metrics!.mostUsedIntents.length).toBeLessThanOrEqual(10);
    });
  });

  describe('event listeners', () => {
    it('should call event listeners', () => {
      const listener = jest.fn();
      analytics.addEventListener('command_executed', listener);

      analytics.trackEvent('command_executed', 'session-1', { test: true });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'command_executed',
          sessionId: 'session-1',
          data: { test: true }
        })
      );
    });

    it('should remove event listeners', () => {
      const listener = jest.fn();
      analytics.addEventListener('command_executed', listener);
      analytics.removeEventListener('command_executed', listener);

      analytics.trackEvent('command_executed', 'session-1');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      analytics.addEventListener('command_executed', listener1);
      analytics.addEventListener('command_executed', listener2);

      analytics.trackEvent('command_executed', 'session-1');

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      analytics.addEventListener('command_executed', errorListener);
      analytics.addEventListener('command_executed', normalListener);

      expect(() => {
        analytics.trackEvent('command_executed', 'session-1');
      }).not.toThrow();

      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('event filtering', () => {
    beforeEach(() => {
      analytics.trackEvent('command_received', 'session-1', {}, 'user-1');
      analytics.trackEvent('command_executed', 'session-1', {}, 'user-1');
      analytics.trackEvent('command_failed', 'session-2', {}, 'user-2');
    });

    it('should filter by event type', () => {
      const events = analytics.getEvents({ eventType: 'command_executed' });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('command_executed');
    });

    it('should filter by session ID', () => {
      const events = analytics.getEvents({ sessionId: 'session-1' });
      expect(events).toHaveLength(2);
    });

    it('should filter by user ID', () => {
      const events = analytics.getEvents({ userId: 'user-1' });
      expect(events).toHaveLength(2);
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const events = analytics.getEvents({
        startTime: now - 1000,
        endTime: now + 1000
      });
      expect(events.length).toBeGreaterThan(0);
    });

    it('should support multiple filters', () => {
      const events = analytics.getEvents({
        eventType: 'command_executed',
        sessionId: 'session-1',
        userId: 'user-1'
      });
      expect(events).toHaveLength(1);
    });
  });

  describe('performance tracking', () => {
    it('should track performance metrics', () => {
      analytics.trackPerformance('session-1', {
        processingTime: 150,
        intentDetectionTime: 50,
        emotionalAnalysisTime: 30
      });

      const events = analytics.getEvents({ eventType: 'command_processed' });
      expect(events).toHaveLength(1);
      expect(events[0].data.performance).toBeDefined();
    });

    it('should not track performance when disabled', () => {
      const noPerfAnalytics = new VoiceAnalytics({ enablePerformanceMetrics: false });

      noPerfAnalytics.trackPerformance('session-1', {
        processingTime: 150,
        intentDetectionTime: 50,
        emotionalAnalysisTime: 30
      });

      const events = noPerfAnalytics.getEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('data management', () => {
    it('should clear all analytics data', () => {
      analytics.startSession('session-1');
      analytics.trackEvent('command_received', 'session-1');

      analytics.clear();

      expect(analytics.getEvents()).toHaveLength(0);
      expect(analytics.getAllSessionMetrics()).toHaveLength(0);
    });

    it('should update configuration', () => {
      analytics.updateConfig({ sampleRate: 0.5 });

      const config = analytics.getConfig();
      expect(config.sampleRate).toBe(0.5);
    });

    it('should get configuration', () => {
      const config = analytics.getConfig();

      expect(config.enableTracking).toBe(true);
      expect(config.enablePerformanceMetrics).toBe(true);
      expect(config.sampleRate).toBe(1.0);
      expect(config.batchSize).toBe(50);
    });
  });
});
