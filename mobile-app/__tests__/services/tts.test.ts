/**
 * TTS Service Tests
 *
 * Tests for iOS Text-to-Speech Bridge functionality
 */

import { NativeModules, Platform } from 'react-native';

// Mock setup before importing service
const mockTTSModule = {
  speak: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  isSpeaking: jest.fn(),
  getAvailableVoices: jest.fn(),
};

jest.mock('react-native', () => ({
  NativeModules: {
    TTSModule: mockTTSModule,
  },
  Platform: {
    OS: 'ios',
  },
}));

// Import after mocking
import { ttsService } from '../../src/services/tts';

describe('TTSService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    ttsService.setLanguage('en');
    ttsService.setRate(1.0);
  });

  describe('speak', () => {
    it('should speak text with default options', async () => {
      mockTTSModule.speak.mockResolvedValueOnce(undefined);

      await ttsService.speak('Hello world');

      expect(mockTTSModule.speak).toHaveBeenCalledWith('Hello world', 'en', 1.0);
    });

    it('should speak text with custom language', async () => {
      mockTTSModule.speak.mockResolvedValueOnce(undefined);

      await ttsService.speak('שלום עולם', { language: 'he' });

      expect(mockTTSModule.speak).toHaveBeenCalledWith('שלום עולם', 'he', 1.0);
    });

    it('should speak text with custom rate', async () => {
      mockTTSModule.speak.mockResolvedValueOnce(undefined);

      await ttsService.speak('Fast speech', { rate: 1.5 });

      expect(mockTTSModule.speak).toHaveBeenCalledWith('Fast speech', 'en', 1.5);
    });

    it('should speak text with both custom options', async () => {
      mockTTSModule.speak.mockResolvedValueOnce(undefined);

      await ttsService.speak('Hola mundo', { language: 'es', rate: 0.8 });

      expect(mockTTSModule.speak).toHaveBeenCalledWith('Hola mundo', 'es', 0.8);
    });

    it('should not speak empty text', async () => {
      await ttsService.speak('');
      await ttsService.speak('   ');

      expect(mockTTSModule.speak).not.toHaveBeenCalled();
    });

    it('should throw error when speak fails', async () => {
      mockTTSModule.speak.mockRejectedValueOnce(new Error('TTS failed'));

      await expect(ttsService.speak('Error text')).rejects.toThrow('TTS failed');
    });
  });

  describe('stop', () => {
    it('should stop speaking', async () => {
      mockTTSModule.stop.mockResolvedValueOnce(undefined);

      await ttsService.stop();

      expect(mockTTSModule.stop).toHaveBeenCalledTimes(1);
    });

    it('should handle stop errors gracefully', async () => {
      mockTTSModule.stop.mockRejectedValueOnce(new Error('Stop failed'));

      await ttsService.stop();

      expect(mockTTSModule.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('pause', () => {
    it('should pause speaking', async () => {
      mockTTSModule.pause.mockResolvedValueOnce(undefined);

      await ttsService.pause();

      expect(mockTTSModule.pause).toHaveBeenCalledTimes(1);
    });

    it('should handle pause errors gracefully', async () => {
      mockTTSModule.pause.mockRejectedValueOnce(new Error('Pause failed'));

      await ttsService.pause();

      expect(mockTTSModule.pause).toHaveBeenCalledTimes(1);
    });
  });

  describe('resume', () => {
    it('should resume speaking', async () => {
      mockTTSModule.resume.mockResolvedValueOnce(undefined);

      await ttsService.resume();

      expect(mockTTSModule.resume).toHaveBeenCalledTimes(1);
    });

    it('should handle resume errors gracefully', async () => {
      mockTTSModule.resume.mockRejectedValueOnce(new Error('Resume failed'));

      await ttsService.resume();

      expect(mockTTSModule.resume).toHaveBeenCalledTimes(1);
    });
  });

  describe('isSpeaking', () => {
    it('should return true when speaking', async () => {
      mockTTSModule.isSpeaking.mockResolvedValueOnce({ speaking: true });

      const result = await ttsService.isSpeaking();

      expect(result).toBe(true);
    });

    it('should return false when not speaking', async () => {
      mockTTSModule.isSpeaking.mockResolvedValueOnce({ speaking: false });

      const result = await ttsService.isSpeaking();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockTTSModule.isSpeaking.mockRejectedValueOnce(new Error('Check failed'));

      const result = await ttsService.isSpeaking();

      expect(result).toBe(false);
    });
  });

  describe('getAvailableVoices', () => {
    it('should return voices for a language', async () => {
      const mockVoices = [
        { identifier: 'com.apple.voice.compact.en-US.Samantha', name: 'Samantha', language: 'en-US', quality: 'enhanced' },
        { identifier: 'com.apple.voice.compact.en-US.Alex', name: 'Alex', language: 'en-US', quality: 'default' },
      ];
      mockTTSModule.getAvailableVoices.mockResolvedValueOnce({ voices: mockVoices });

      const result = await ttsService.getAvailableVoices('en');

      expect(result).toEqual(mockVoices);
      expect(mockTTSModule.getAvailableVoices).toHaveBeenCalledWith('en');
    });

    it('should return empty array for Hebrew voices', async () => {
      mockTTSModule.getAvailableVoices.mockResolvedValueOnce({ voices: [] });

      const result = await ttsService.getAvailableVoices('he');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockTTSModule.getAvailableVoices.mockRejectedValueOnce(new Error('Voices failed'));

      const result = await ttsService.getAvailableVoices('en');

      expect(result).toEqual([]);
    });
  });

  describe('setLanguage', () => {
    it('should update default language', async () => {
      mockTTSModule.speak.mockResolvedValue(undefined);

      ttsService.setLanguage('he');
      await ttsService.speak('Test');

      expect(mockTTSModule.speak).toHaveBeenCalledWith('Test', 'he', 1.0);
    });
  });

  describe('setRate', () => {
    it('should update default rate', async () => {
      mockTTSModule.speak.mockResolvedValue(undefined);

      ttsService.setRate(1.5);
      await ttsService.speak('Test');

      expect(mockTTSModule.speak).toHaveBeenCalledWith('Test', 'en', 1.5);
    });

    it('should clamp rate to minimum 0.5', async () => {
      mockTTSModule.speak.mockResolvedValue(undefined);

      ttsService.setRate(0.1);
      await ttsService.speak('Test');

      expect(mockTTSModule.speak).toHaveBeenCalledWith('Test', 'en', 0.5);
    });

    it('should clamp rate to maximum 2.0', async () => {
      mockTTSModule.speak.mockResolvedValue(undefined);

      ttsService.setRate(3.0);
      await ttsService.speak('Test');

      expect(mockTTSModule.speak).toHaveBeenCalledWith('Test', 'en', 2.0);
    });
  });
});
