/**
 * Voice Processor Tests
 */

import { VoiceProcessor } from '../VoiceProcessor';
import type { VoiceCommand } from '../types';

describe('VoiceProcessor', () => {
  let processor: VoiceProcessor;

  beforeEach(() => {
    processor = new VoiceProcessor({
      language: 'en-US',
      confidenceThreshold: 0.7,
      enableIntentDetection: true,
      enableCommandHistory: true,
      maxHistoryLength: 50
    });
  });

  describe('processTranscript', () => {
    it('should process search command', () => {
      const result = processor.processTranscript('search for action movies', 0.95);

      expect(result.intent.action).toBe('search');
      expect(result.intent.entity).toBe('action movies');
      expect(result.shouldExecute).toBe(true);
    });

    it('should process play command', () => {
      const result = processor.processTranscript('play the avengers', 0.9);

      expect(result.intent.action).toBe('play');
      expect(result.intent.entity).toBe('the avengers');
      expect(result.shouldExecute).toBe(true);
    });

    it('should process navigate command', () => {
      const result = processor.processTranscript('go to settings', 0.85);

      expect(result.intent.action).toBe('navigate');
      expect(result.intent.entity).toBe('settings');
      expect(result.shouldExecute).toBe(true);
    });

    it('should process volume command', () => {
      const result = processor.processTranscript('volume up', 0.9);

      expect(result.intent.action).toBe('volume');
      expect(result.intent.parameters?.direction).toBe('up');
      expect(result.shouldExecute).toBe(true);
    });

    it('should reject low confidence commands', () => {
      const result = processor.processTranscript('unclear mumbling', 0.3);

      expect(result.shouldExecute).toBe(false);
      expect(result.reason).toBe('Low confidence in voice recognition');
    });

    it('should handle unknown intents', () => {
      const result = processor.processTranscript('random gibberish xyz', 0.95);

      expect(result.intent.action).toBe('unknown');
      expect(result.shouldExecute).toBe(false);
    });
  });

  describe('processCommand', () => {
    it('should process voice command object', () => {
      const command: VoiceCommand = {
        transcript: 'find action movies',
        confidence: 0.92,
        language: 'en-US',
        timestamp: Date.now()
      };

      const result = processor.processCommand(command);

      expect(result.command).toBe(command);
      expect(result.intent.action).toBe('search');
      expect(result.shouldExecute).toBe(true);
    });

    it('should add command to history', () => {
      processor.processTranscript('test command 1', 0.9);
      processor.processTranscript('test command 2', 0.9);

      const history = processor.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].transcript).toBe('test command 1');
      expect(history[1].transcript).toBe('test command 2');
    });
  });

  describe('command history', () => {
    it('should maintain command history', () => {
      for (let i = 1; i <= 10; i++) {
        processor.processTranscript(`command ${i}`, 0.9);
      }

      const history = processor.getHistory();
      expect(history).toHaveLength(10);
    });

    it('should trim history when max length exceeded', () => {
      const smallProcessor = new VoiceProcessor({ maxHistoryLength: 5 });

      for (let i = 1; i <= 10; i++) {
        smallProcessor.processTranscript(`command ${i}`, 0.9);
      }

      const history = smallProcessor.getHistory();
      expect(history).toHaveLength(5);
      expect(history[0].transcript).toBe('command 6');
      expect(history[4].transcript).toBe('command 10');
    });

    it('should get recent transcripts', () => {
      processor.processTranscript('command 1', 0.9);
      processor.processTranscript('command 2', 0.9);
      processor.processTranscript('command 3', 0.9);

      const recent = processor.getRecentTranscripts(2);
      expect(recent).toEqual(['command 2', 'command 3']);
    });

    it('should clear history', () => {
      processor.processTranscript('command 1', 0.9);
      processor.processTranscript('command 2', 0.9);

      processor.clearHistory();

      const history = processor.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultProcessor = new VoiceProcessor();
      const config = defaultProcessor.getConfig();

      expect(config.language).toBe('en-US');
      expect(config.confidenceThreshold).toBe(0.7);
      expect(config.enableIntentDetection).toBe(true);
      expect(config.enableCommandHistory).toBe(true);
      expect(config.maxHistoryLength).toBe(50);
    });

    it('should update configuration', () => {
      processor.updateConfig({ confidenceThreshold: 0.8 });

      const config = processor.getConfig();
      expect(config.confidenceThreshold).toBe(0.8);
    });

    it('should respect disabled intent detection', () => {
      const noIntentProcessor = new VoiceProcessor({ enableIntentDetection: false });
      const result = noIntentProcessor.processTranscript('search for movies', 0.9);

      expect(result.intent.action).toBe('unknown');
    });

    it('should respect disabled history', () => {
      const noHistoryProcessor = new VoiceProcessor({ enableCommandHistory: false });

      noHistoryProcessor.processTranscript('command 1', 0.9);
      noHistoryProcessor.processTranscript('command 2', 0.9);

      const history = noHistoryProcessor.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('intent detection', () => {
    it('should detect search variations', () => {
      const variations = [
        'search for movies',
        'find the series',
        'look for shows',
        'show me action',
        "where's the movie",
        'looking for comedy'
      ];

      for (const variation of variations) {
        const result = processor.processTranscript(variation, 0.9);
        expect(result.intent.action).toBe('search');
      }
    });

    it('should detect play variations', () => {
      const variations = [
        'play the movie',
        'watch the series',
        'start playing',
        'put on netflix',
        'show breaking bad'
      ];

      for (const variation of variations) {
        const result = processor.processTranscript(variation, 0.9);
        expect(result.intent.action).toBe('play');
      }
    });

    it('should detect pause/stop commands', () => {
      const result1 = processor.processTranscript('pause', 0.9);
      expect(result1.intent.action).toBe('pause');

      const result2 = processor.processTranscript('stop', 0.9);
      expect(result2.intent.action).toBe('stop');
    });

    it('should detect navigation commands', () => {
      const result1 = processor.processTranscript('go to home', 0.9);
      expect(result1.intent.action).toBe('navigate');

      const result2 = processor.processTranscript('settings', 0.9);
      expect(result2.intent.action).toBe('navigate');
    });

    it('should detect help commands', () => {
      const result1 = processor.processTranscript('help', 0.9);
      expect(result1.intent.action).toBe('help');

      const result2 = processor.processTranscript('how do I search', 0.9);
      expect(result2.intent.action).toBe('help');
    });
  });

  describe('parameter extraction', () => {
    it('should extract volume direction', () => {
      const result1 = processor.processTranscript('volume up', 0.9);
      expect(result1.intent.parameters?.direction).toBe('up');

      const result2 = processor.processTranscript('volume down', 0.9);
      expect(result2.intent.parameters?.direction).toBe('down');
    });

    it('should extract volume percentage', () => {
      const result = processor.processTranscript('set volume to 50 percent', 0.9);
      expect(result.intent.parameters?.level).toBe(50);
    });

    it('should extract content type for search - movie', () => {
      const result = processor.processTranscript('search for a movie', 0.9);
      expect(result.intent.parameters?.contentType).toBe('movie');
    });

    it('should extract content type for search - series', () => {
      const result = processor.processTranscript('find a series', 0.9);
      expect(result.intent.parameters?.contentType).toBe('series');
    });

    it('should extract content type for search - podcast', () => {
      const result = processor.processTranscript('show podcasts', 0.9);
      expect(result.intent.action).toBe('search'); // Verify it's matching search
      expect(result.intent.parameters?.contentType).toBe('podcast');
    });
  });
});
