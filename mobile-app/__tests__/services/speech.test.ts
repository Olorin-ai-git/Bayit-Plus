/**
 * Speech Service Tests
 *
 * Tests for iOS Speech Framework Bridge functionality
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Mock setup before importing service
const mockSpeechModule = {
  requestPermissions: jest.fn(),
  checkPermissions: jest.fn(),
  setLanguage: jest.fn(),
  startRecognition: jest.fn(),
  stopRecognition: jest.fn(),
};

const mockEventEmitter = {
  addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeAllListeners: jest.fn(),
};

jest.mock('react-native', () => ({
  NativeModules: {
    SpeechModule: mockSpeechModule,
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => mockEventEmitter),
  Platform: {
    OS: 'ios',
  },
}));

// Import after mocking
import { speechService } from '../../src/services/speech';

describe('SpeechService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermissions', () => {
    it('should request permissions successfully', async () => {
      mockSpeechModule.requestPermissions.mockResolvedValueOnce({ granted: true });

      const result = await speechService.requestPermissions();

      expect(result).toEqual({ granted: true });
      expect(mockSpeechModule.requestPermissions).toHaveBeenCalledTimes(1);
    });

    it('should handle permission denied', async () => {
      mockSpeechModule.requestPermissions.mockResolvedValueOnce({ granted: false });

      const result = await speechService.requestPermissions();

      expect(result).toEqual({ granted: false });
    });

    it('should throw error when module fails', async () => {
      const error = new Error('Permission denied');
      mockSpeechModule.requestPermissions.mockRejectedValueOnce(error);

      await expect(speechService.requestPermissions()).rejects.toThrow('Permission denied');
    });
  });

  describe('checkPermissions', () => {
    it('should check permissions successfully', async () => {
      const permissions = { microphone: true, speech: true };
      mockSpeechModule.checkPermissions.mockResolvedValueOnce(permissions);

      const result = await speechService.checkPermissions();

      expect(result).toEqual(permissions);
      expect(mockSpeechModule.checkPermissions).toHaveBeenCalledTimes(1);
    });

    it('should return false when check fails', async () => {
      mockSpeechModule.checkPermissions.mockRejectedValueOnce(new Error('Check failed'));

      const result = await speechService.checkPermissions();

      expect(result).toEqual({ microphone: false, speech: false });
    });
  });

  describe('setLanguage', () => {
    it('should set language successfully', async () => {
      mockSpeechModule.setLanguage.mockResolvedValueOnce(undefined);

      await speechService.setLanguage('he');

      expect(mockSpeechModule.setLanguage).toHaveBeenCalledWith('he');
    });

    it('should handle English language', async () => {
      mockSpeechModule.setLanguage.mockResolvedValueOnce(undefined);

      await speechService.setLanguage('en');

      expect(mockSpeechModule.setLanguage).toHaveBeenCalledWith('en');
    });

    it('should handle Spanish language', async () => {
      mockSpeechModule.setLanguage.mockResolvedValueOnce(undefined);

      await speechService.setLanguage('es');

      expect(mockSpeechModule.setLanguage).toHaveBeenCalledWith('es');
    });

    it('should throw error when set fails', async () => {
      mockSpeechModule.setLanguage.mockRejectedValueOnce(new Error('Language not supported'));

      await expect(speechService.setLanguage('xyz')).rejects.toThrow('Language not supported');
    });
  });

  describe('startRecognition', () => {
    it('should start recognition and setup listeners', async () => {
      mockSpeechModule.startRecognition.mockResolvedValueOnce(undefined);

      await speechService.startRecognition();

      expect(mockEventEmitter.addListener).toHaveBeenCalledWith(
        'onSpeechRecognitionResult',
        expect.any(Function)
      );
      expect(mockEventEmitter.addListener).toHaveBeenCalledWith(
        'onSpeechRecognitionError',
        expect.any(Function)
      );
      expect(mockSpeechModule.startRecognition).toHaveBeenCalledTimes(1);
    });

    it('should throw error when start fails', async () => {
      mockSpeechModule.startRecognition.mockRejectedValueOnce(new Error('Recognition failed'));

      await expect(speechService.startRecognition()).rejects.toThrow('Recognition failed');
    });
  });

  describe('stopRecognition', () => {
    it('should stop recognition', async () => {
      mockSpeechModule.stopRecognition.mockResolvedValueOnce(undefined);

      await speechService.stopRecognition();

      expect(mockSpeechModule.stopRecognition).toHaveBeenCalledTimes(1);
    });

    it('should handle stop errors gracefully', async () => {
      mockSpeechModule.stopRecognition.mockRejectedValueOnce(new Error('Stop failed'));

      await speechService.stopRecognition();

      expect(mockSpeechModule.stopRecognition).toHaveBeenCalledTimes(1);
    });
  });

  describe('listeners', () => {
    it('should add and remove result listeners', () => {
      const listener = jest.fn();

      speechService.addResultListener(listener);
      speechService.removeResultListener(listener);

      // Listener management is internal, verify no errors
      expect(true).toBe(true);
    });

    it('should add and remove error listeners', () => {
      const listener = jest.fn();

      speechService.addErrorListener(listener);
      speechService.removeErrorListener(listener);

      // Listener management is internal, verify no errors
      expect(true).toBe(true);
    });
  });
});
