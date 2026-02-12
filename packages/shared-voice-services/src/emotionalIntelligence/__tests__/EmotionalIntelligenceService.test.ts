/**
 * Emotional Intelligence Service Tests
 */

import { EmotionalIntelligenceService } from '../EmotionalIntelligenceService';

describe('EmotionalIntelligenceService', () => {
  let service: EmotionalIntelligenceService;

  beforeEach(() => {
    service = new EmotionalIntelligenceService();
  });

  describe('analyzeVoicePattern', () => {
    it('should detect low frustration for successful interactions', () => {
      const analysis = service.analyzeVoicePattern(
        'Play the movie',
        ['play movie', 'show movie'],
        [true, true]
      );

      expect(analysis.frustrationLevel).toBeLessThan(0.3);
      expect(analysis.mood).toBe('satisfied');
      expect(analysis.confidence).toBeGreaterThan(0.7);
      expect(analysis.suggestion).toBeUndefined();
    });

    it('should detect high frustration for repeated failures', () => {
      const analysis = service.analyzeVoicePattern(
        'Where is that movie?',
        ['find movie', 'search movie', 'where movie', 'show movie', 'find movie'],
        [false, false, false, false, false]
      );

      expect(analysis.frustrationLevel).toBeGreaterThan(0.6);
      expect(analysis.mood).toBe('frustrated');
      expect(analysis.confidence).toBeLessThanOrEqual(0.5);
      expect(analysis.suggestion).toBeDefined();
    });

    it('should detect repeated keywords', () => {
      const analysis = service.analyzeVoicePattern(
        'Find the movie',
        ['find movie', 'find series', 'find show'],
        [false, false, false]
      );

      expect(analysis.patterns.repeatedKeywords).toContain('find');
      expect(analysis.frustrationLevel).toBeGreaterThan(0.4);
    });

    it('should handle empty command history', () => {
      const analysis = service.analyzeVoicePattern(
        'Play movie',
        [],
        []
      );

      expect(analysis.frustrationLevel).toBeGreaterThanOrEqual(0);
      expect(analysis.frustrationLevel).toBeLessThanOrEqual(1);
      expect(analysis.mood).toBeDefined();
    });

    it('should detect escalating language', () => {
      const analysis = service.analyzeVoicePattern(
        'please help me find this movie',
        ['find movie', 'where is movie', 'help find movie', 'please find'],
        [false, false, false, false]
      );

      expect(analysis.patterns.escalatingLanguage).toBe(true);
      expect(analysis.frustrationLevel).toBeGreaterThan(0.5);
    });
  });

  describe('generateAdaptiveResponse', () => {
    it('should return original response for low frustration', () => {
      const response = service.generateAdaptiveResponse(
        'Here are the results',
        0.3
      );

      expect(response).toBe('Here are the results');
    });

    it('should add empathy for high frustration', () => {
      const response = service.generateAdaptiveResponse(
        'Here are the results',
        0.8
      );

      expect(response).toContain('I understand this is frustrating');
      expect(response).toContain('Here are the results');
    });

    it('should add help offer for medium frustration', () => {
      const response = service.generateAdaptiveResponse(
        'Here are the results',
        0.6
      );

      expect(response).toContain('Let me try to help');
      expect(response).toContain('Here are the results');
    });
  });

  describe('shouldOfferHelp', () => {
    it('should offer help after 3 consecutive failures', () => {
      const analysis = service.analyzeVoicePattern(
        'Find movie',
        ['find', 'search', 'where'],
        [false, false, false]
      );

      const shouldOffer = service.shouldOfferHelp(analysis, ['find', 'search', 'where']);
      expect(shouldOffer).toBe(true);
    });

    it('should offer help for high frustration', () => {
      const analysis = service.analyzeVoicePattern(
        'Where is anything?',
        ['find', 'search', 'where', 'show', 'help'],
        [false, false, false, false, false]
      );

      const shouldOffer = service.shouldOfferHelp(analysis, ['find', 'search', 'where', 'show', 'help']);
      expect(shouldOffer).toBe(true);
    });

    it('should not offer help for successful interactions', () => {
      const analysis = service.analyzeVoicePattern(
        'Play movie',
        ['play', 'show'],
        [true, true]
      );

      const shouldOffer = service.shouldOfferHelp(analysis, ['play', 'show']);
      expect(shouldOffer).toBe(false);
    });
  });

  describe('getToneAdjustment', () => {
    it('should return slow rate for high frustration', () => {
      const adjustment = service.getToneAdjustment(0.8);

      expect(adjustment.responseSpeed).toBe('slow');
      expect(adjustment.ttsRate).toBe(0.8);
      expect(adjustment.verbosity).toBe('detailed');
    });

    it('should return fast rate for low frustration', () => {
      const adjustment = service.getToneAdjustment(0.2);

      expect(adjustment.responseSpeed).toBe('fast');
      expect(adjustment.ttsRate).toBe(1.2);
      expect(adjustment.verbosity).toBe('concise');
    });

    it('should return normal rate for medium frustration', () => {
      const adjustment = service.getToneAdjustment(0.5);

      expect(adjustment.responseSpeed).toBe('normal');
      expect(adjustment.ttsRate).toBe(1.0);
      expect(adjustment.verbosity).toBe('normal');
    });
  });

  describe('adjustTTSRate', () => {
    it('should adjust TTS rate within safe bounds', () => {
      const rate1 = service.adjustTTSRate(1.0, 0.8); // High frustration
      expect(rate1).toBe(0.8);

      const rate2 = service.adjustTTSRate(1.0, 0.2); // Low frustration
      expect(rate2).toBe(1.2);

      const rate3 = service.adjustTTSRate(1.0, 0.5); // Medium frustration
      expect(rate3).toBe(1.0);
    });

    it('should clamp to minimum 0.5', () => {
      const rate = service.adjustTTSRate(0.1, 0.9); // Very slow base * slow adjustment
      expect(rate).toBeGreaterThanOrEqual(0.5);
    });

    it('should clamp to maximum 2.0', () => {
      const rate = service.adjustTTSRate(2.0, 0.1); // Fast base * fast adjustment
      expect(rate).toBeLessThanOrEqual(2.0);
    });
  });

  describe('generateHelpSuggestion', () => {
    it('should generate contextual help suggestion', () => {
      const analysis = service.analyzeVoicePattern(
        'Find movie',
        ['find', 'search'],
        [false, false]
      );

      const suggestion = service.generateHelpSuggestion(analysis);
      expect(suggestion).toBeDefined();
      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
    });
  });
});
