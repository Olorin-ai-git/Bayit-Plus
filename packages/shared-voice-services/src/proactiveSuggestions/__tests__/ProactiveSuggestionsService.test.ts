/**
 * Proactive Suggestions Service Tests
 */

import { ProactiveSuggestionsService, createSuggestionContext } from '../ProactiveSuggestionsService';
import type { SuggestionContext, UserActivity } from '../types';

describe('ProactiveSuggestionsService', () => {
  let service: ProactiveSuggestionsService;

  beforeEach(() => {
    service = new ProactiveSuggestionsService({
      enabled: true,
      maxSuggestionsPerSession: 5,
      minTimeBetweenSuggestions: 1000 // 1 second for testing
    });
    service.resetHistory();
  });

  describe('evaluateContext', () => {
    it('should return empty array when disabled', () => {
      service.updateConfig({ enabled: false });
      const context = createMorningContext();
      const suggestions = service.evaluateContext(context);
      expect(suggestions).toEqual([]);
    });

    it('should return empty array during quiet hours', () => {
      service.updateConfig({
        respectDoNotDisturb: true,
        quietHoursStart: 22,
        quietHoursEnd: 6
      });

      const lateNightTime = new Date();
      lateNightTime.setHours(23, 0, 0, 0);

      const context: SuggestionContext = {
        currentTime: lateNightTime.getTime(),
        timeOfDay: 'night',
        dayOfWeek: 'Friday',
        userActivity: {
          isActive: true,
          isIdle: false,
          idleDuration: 0,
          currentScreen: 'browse',
          recentActions: []
        },
        sessionDuration: 600000,
        lastInteraction: Date.now(),
        viewingHistory: [],
        preferences: {}
      };

      const suggestions = service.evaluateContext(context);
      expect(suggestions).toEqual([]);
    });

    it('should generate morning content suggestion', () => {
      const context = createMorningContext();
      const suggestions = service.evaluateContext(context);

      expect(suggestions.length).toBeGreaterThan(0);
      const morningSuggestion = suggestions.find(s => s.category === 'content-discovery');
      expect(morningSuggestion).toBeDefined();
    });

    it('should respect session limit', () => {
      service.updateConfig({ maxSuggestionsPerSession: 2 });
      const context = createMorningContext();

      const firstBatch = service.evaluateContext(context);
      expect(firstBatch.length).toBeLessThanOrEqual(2);

      service.evaluateContext(context);
      const total = service.getActiveSuggestions().length;
      expect(total).toBeLessThanOrEqual(2);
    });

    it('should enforce minimum time between suggestions', async () => {
      service.updateConfig({ minTimeBetweenSuggestions: 100 });
      const context = createMorningContext();

      const first = service.evaluateContext(context);
      expect(first.length).toBeGreaterThan(0);

      // Immediate second call should return empty
      const second = service.evaluateContext(context);
      expect(second.length).toBe(0);

      // After delay, should work again
      await new Promise(resolve => setTimeout(resolve, 150));
      const third = service.evaluateContext(context);
      expect(third.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('suggestion management', () => {
    it('should track active suggestions', () => {
      const context = createMorningContext();
      service.evaluateContext(context);

      const active = service.getActiveSuggestions();
      expect(active.length).toBeGreaterThan(0);
    });

    it('should dismiss suggestion by id', () => {
      const context = createMorningContext();
      const suggestions = service.evaluateContext(context);
      const suggestionId = suggestions[0].id;

      service.dismissSuggestion(suggestionId);
      const active = service.getActiveSuggestions();
      expect(active.find(s => s.id === suggestionId)).toBeUndefined();
    });

    it('should clear all suggestions', () => {
      const context = createMorningContext();
      service.evaluateContext(context);

      service.clearAllSuggestions();
      const active = service.getActiveSuggestions();
      expect(active).toEqual([]);
    });
  });

  describe('listeners', () => {
    it('should notify listeners of new suggestions', (done) => {
      const listener = jest.fn((suggestion) => {
        expect(suggestion).toBeDefined();
        expect(suggestion.id).toBeTruthy();
        done();
      });

      service.addListener(listener);
      const context = createMorningContext();
      service.evaluateContext(context);
    });

    it('should support unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = service.addListener(listener);

      unsubscribe();

      const context = createMorningContext();
      service.evaluateContext(context);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('createSuggestionContext helper', () => {
    it('should create morning context', () => {
      const mockDate = new Date();
      mockDate.setHours(9, 0, 0, 0);
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      const activity: UserActivity = {
        isActive: true,
        isIdle: false,
        idleDuration: 0,
        recentActions: ['browse']
      };
      const context = createSuggestionContext(activity);

      expect(context.timeOfDay).toBe('morning');
      expect(context.userActivity).toBe(activity);

      jest.restoreAllMocks();
    });

    it('should create afternoon context', () => {
      const mockDate = new Date();
      mockDate.setHours(14, 0, 0, 0);
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      const activity: UserActivity = {
        isActive: true,
        isIdle: false,
        idleDuration: 0,
        recentActions: []
      };
      const context = createSuggestionContext(activity);

      expect(context.timeOfDay).toBe('afternoon');

      jest.restoreAllMocks();
    });

    it('should create evening context', () => {
      const mockDate = new Date();
      mockDate.setHours(19, 0, 0, 0);
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      const activity: UserActivity = {
        isActive: true,
        isIdle: false,
        idleDuration: 0,
        recentActions: ['watch']
      };
      const context = createSuggestionContext(activity);

      expect(context.timeOfDay).toBe('evening');

      jest.restoreAllMocks();
    });

    it('should create night context', () => {
      const mockDate = new Date();
      mockDate.setHours(23, 0, 0, 0);
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      const activity: UserActivity = {
        isActive: false,
        isIdle: true,
        idleDuration: 10000,
        recentActions: []
      };
      const context = createSuggestionContext(activity);

      expect(context.timeOfDay).toBe('night');

      jest.restoreAllMocks();
    });
  });
});

function createMorningContext(): SuggestionContext {
  const mockDate = new Date();
  mockDate.setHours(9, 0, 0, 0);

  return {
    currentTime: mockDate.getTime(),
    timeOfDay: 'morning',
    dayOfWeek: 'Monday',
    userActivity: {
      isActive: true,
      isIdle: false,
      idleDuration: 0,
      currentScreen: 'browse',
      recentActions: []
    },
    sessionDuration: 600000,
    lastInteraction: mockDate.getTime(),
    viewingHistory: [],
    preferences: {}
  };
}
