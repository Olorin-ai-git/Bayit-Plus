/**
 * useAudioCapture Hook - tvOS Native Audio Capture (TurboModule)
 *
 * React Native wrapper for the native AudioCaptureModule.
 * Updated for React Native 0.76 New Architecture using TurboModuleRegistry.
 *
 * Event listener setup is extracted to useAudioCaptureEvents.
 */

import { useState, useCallback } from 'react';
import { Platform, TurboModuleRegistry } from 'react-native';
import { logger } from '../utils/logger';
import { useAudioCaptureEvents } from './useAudioCaptureEvents';
import type { AudioLevel, UseAudioCaptureOptions, UseAudioCaptureReturn } from './types/audioCapture.types';

// Re-export types for backward compatibility
export type { AudioLevel, UseAudioCaptureOptions, UseAudioCaptureReturn } from './types/audioCapture.types';

const AudioCaptureModule = TurboModuleRegistry.get('AudioCaptureModule');

/**
 * Hook to manage native audio capture on tvOS
 */
export function useAudioCapture(options: UseAudioCaptureOptions = {}): UseAudioCaptureReturn {
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState<AudioLevel>({ average: 0, peak: 0 });
  const [error, setError] = useState<Error | null>(null);

  const isSupported = Platform.OS === 'ios' && Platform.isTV && AudioCaptureModule != null;

  // Set up event listeners via extracted hook
  useAudioCaptureEvents({
    isSupported, AudioCaptureModule, setAudioLevel, setError, setIsListening, options,
  });

  const startListening = useCallback(async (): Promise<void> => {
    if (!isSupported || !AudioCaptureModule) throw new Error('Audio capture not supported on this platform');
    try {
      setError(null);
      const result = await (AudioCaptureModule as any).startListening();
      if (result.status === 'listening' || result.status === 'already_listening') {
        setIsListening(true);
        logger.info('Started listening', { module: 'AudioCapture' });
      }
    } catch (err: any) {
      const captureError = new Error(err.message || 'Failed to start listening');
      setError(captureError);
      throw captureError;
    }
  }, [isSupported]);

  const stopListening = useCallback(async (): Promise<string | null> => {
    if (!isSupported || !AudioCaptureModule) throw new Error('Audio capture not supported on this platform');
    try {
      const result = await (AudioCaptureModule as any).stopListening();
      setIsListening(false);
      setAudioLevel({ average: 0, peak: 0 });
      logger.info('Stopped listening', { module: 'AudioCapture' });
      return result.audioFilePath || null;
    } catch (err: any) {
      const captureError = new Error(err.message || 'Failed to stop listening');
      setError(captureError);
      throw captureError;
    }
  }, [isSupported]);

  const getAudioLevel = useCallback(async (): Promise<AudioLevel> => {
    if (!isSupported || !AudioCaptureModule) return { average: 0, peak: 0 };
    try {
      const result = await (AudioCaptureModule as any).getAudioLevel();
      return { average: result.average || 0, peak: result.peak || 0 };
    } catch {
      return { average: 0, peak: 0 };
    }
  }, [isSupported]);

  const clearBuffer = useCallback(async (): Promise<void> => {
    if (!isSupported || !AudioCaptureModule) return;
    try {
      await (AudioCaptureModule as any).clearBuffer();
    } catch (err: any) {
      logger.warn('Failed to clear buffer', { module: 'AudioCapture', error: err.message });
    }
  }, [isSupported]);

  return { isListening, isSupported, audioLevel, startListening, stopListening, getAudioLevel, clearBuffer, error };
}

export default useAudioCapture;
