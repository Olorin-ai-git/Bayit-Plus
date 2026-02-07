/**
 * useAudioCaptureEvents - Event Listener Setup for Audio Capture
 *
 * Sets up native event emitter subscriptions for the AudioCaptureModule
 * and manages subscription lifecycle.
 */

import { useEffect, useRef } from 'react';
import { NativeEventEmitter } from 'react-native';
import { logger } from '../utils/logger';
import type { AudioLevel, UseAudioCaptureOptions } from './types/audioCapture.types';

interface EventSetupParams {
  isSupported: boolean;
  AudioCaptureModule: any;
  setAudioLevel: (level: AudioLevel) => void;
  setError: (error: Error | null) => void;
  setIsListening: (listening: boolean) => void;
  options: UseAudioCaptureOptions;
}

/**
 * Hook to set up native event listeners for audio capture on tvOS
 */
export function useAudioCaptureEvents(params: EventSetupParams) {
  const { isSupported, AudioCaptureModule, setAudioLevel, setError, setIsListening, options } = params;
  const { onAudioLevel, onSpeechDetected, onSilenceDetected, onError } = options;

  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  const subscriptionsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!isSupported || !AudioCaptureModule) {
      logger.debug('Module not available', { module: 'AudioCapture' });
      return;
    }

    try {
      eventEmitterRef.current = new NativeEventEmitter(AudioCaptureModule as any);

      const levelSub = eventEmitterRef.current.addListener('onAudioLevel', (level: AudioLevel) => {
        setAudioLevel(level);
        onAudioLevel?.(level);
      });

      const speechSub = eventEmitterRef.current.addListener('onSpeechDetected', () => {
        onSpeechDetected?.();
      });

      const silenceSub = eventEmitterRef.current.addListener('onSilenceDetected', () => {
        onSilenceDetected?.();
      });

      const errorSub = eventEmitterRef.current.addListener('onError', (err: { message: string; code?: string }) => {
        const captureError = new Error(err.message);
        setError(captureError);
        onError?.(captureError);
      });

      subscriptionsRef.current = [levelSub, speechSub, silenceSub, errorSub];
      logger.info('Event listeners set up successfully', { module: 'AudioCapture' });

      // Check if already listening
      (AudioCaptureModule as any).isCurrentlyListening()
        .then((result: { listening: boolean }) => setIsListening(result.listening))
        .catch(() => { /* Ignore errors checking initial state */ });

      return () => {
        subscriptionsRef.current.forEach((sub) => sub?.remove?.());
        subscriptionsRef.current = [];
      };
    } catch (err) {
      logger.error('Failed to set up event listeners', { module: 'AudioCapture', error: err });
      const setupError = err instanceof Error ? err : new Error('Failed to set up audio capture');
      setError(setupError);
      onError?.(setupError);
    }
  }, [isSupported, AudioCaptureModule, onAudioLevel, onSpeechDetected, onSilenceDetected, onError, setAudioLevel, setError, setIsListening]);
}
