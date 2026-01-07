/**
 * useAudioCapture Hook - tvOS Native Audio Capture
 *
 * React Native wrapper for the native AudioCaptureModule Swift implementation.
 * Provides audio capture capabilities for the constant listening feature on tvOS.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { AudioCaptureModule } = NativeModules;

export interface AudioLevel {
  average: number;
  peak: number;
}

export interface UseAudioCaptureOptions {
  onAudioLevel?: (level: AudioLevel) => void;
  onSpeechDetected?: () => void;
  onSilenceDetected?: () => void;
  onError?: (error: Error) => void;
}

export interface UseAudioCaptureReturn {
  isListening: boolean;
  isSupported: boolean;
  audioLevel: AudioLevel;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string | null>;
  getAudioLevel: () => Promise<AudioLevel>;
  clearBuffer: () => Promise<void>;
  error: Error | null;
}

/**
 * Hook to manage native audio capture on tvOS
 */
export function useAudioCapture(options: UseAudioCaptureOptions = {}): UseAudioCaptureReturn {
  const { onAudioLevel, onSpeechDetected, onSilenceDetected, onError } = options;

  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState<AudioLevel>({ average: 0, peak: 0 });
  const [error, setError] = useState<Error | null>(null);

  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  const subscriptionsRef = useRef<any[]>([]);

  // Check if native module is supported
  const isSupported = Platform.OS === 'ios' && !!AudioCaptureModule;

  // Set up event listeners
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    // Create event emitter
    eventEmitterRef.current = new NativeEventEmitter(AudioCaptureModule);

    // Subscribe to audio level events
    const levelSubscription = eventEmitterRef.current.addListener(
      'onAudioLevel',
      (level: AudioLevel) => {
        setAudioLevel(level);
        onAudioLevel?.(level);
      }
    );

    // Subscribe to speech detected events
    const speechSubscription = eventEmitterRef.current.addListener(
      'onSpeechDetected',
      () => {
        onSpeechDetected?.();
      }
    );

    // Subscribe to silence detected events
    const silenceSubscription = eventEmitterRef.current.addListener(
      'onSilenceDetected',
      () => {
        onSilenceDetected?.();
      }
    );

    // Subscribe to error events
    const errorSubscription = eventEmitterRef.current.addListener(
      'onError',
      (err: { message: string; code?: string }) => {
        const captureError = new Error(err.message);
        setError(captureError);
        onError?.(captureError);
      }
    );

    subscriptionsRef.current = [
      levelSubscription,
      speechSubscription,
      silenceSubscription,
      errorSubscription,
    ];

    // Check if already listening
    AudioCaptureModule.isCurrentlyListening()
      .then((result: { listening: boolean }) => {
        setIsListening(result.listening);
      })
      .catch(() => {
        // Ignore errors checking initial state
      });

    // Cleanup subscriptions on unmount
    return () => {
      subscriptionsRef.current.forEach((sub) => sub.remove());
      subscriptionsRef.current = [];
    };
  }, [isSupported, onAudioLevel, onSpeechDetected, onSilenceDetected, onError]);

  /**
   * Start listening for audio
   */
  const startListening = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      throw new Error('Audio capture not supported on this platform');
    }

    try {
      setError(null);
      const result = await AudioCaptureModule.startListening();

      if (result.status === 'listening' || result.status === 'already_listening') {
        setIsListening(true);
      }
    } catch (err: any) {
      const captureError = new Error(err.message || 'Failed to start listening');
      setError(captureError);
      throw captureError;
    }
  }, [isSupported]);

  /**
   * Stop listening and export audio buffer
   * @returns Path to the exported audio file, or null if no audio was captured
   */
  const stopListening = useCallback(async (): Promise<string | null> => {
    if (!isSupported) {
      throw new Error('Audio capture not supported on this platform');
    }

    try {
      const result = await AudioCaptureModule.stopListening();
      setIsListening(false);
      setAudioLevel({ average: 0, peak: 0 });

      return result.audioFilePath || null;
    } catch (err: any) {
      const captureError = new Error(err.message || 'Failed to stop listening');
      setError(captureError);
      throw captureError;
    }
  }, [isSupported]);

  /**
   * Get current audio level
   */
  const getAudioLevel = useCallback(async (): Promise<AudioLevel> => {
    if (!isSupported) {
      return { average: 0, peak: 0 };
    }

    try {
      const result = await AudioCaptureModule.getAudioLevel();
      return {
        average: result.average || 0,
        peak: result.peak || 0,
      };
    } catch {
      return { average: 0, peak: 0 };
    }
  }, [isSupported]);

  /**
   * Clear the audio buffer
   */
  const clearBuffer = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      return;
    }

    try {
      await AudioCaptureModule.clearBuffer();
    } catch (err: any) {
      console.warn('[AudioCapture] Failed to clear buffer:', err.message);
    }
  }, [isSupported]);

  return {
    isListening,
    isSupported,
    audioLevel,
    startListening,
    stopListening,
    getAudioLevel,
    clearBuffer,
    error,
  };
}

export default useAudioCapture;
