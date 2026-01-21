/**
 * useAudioCapture Hook - tvOS Native Audio Capture (TurboModule)
 *
 * React Native wrapper for the native AudioCaptureModule.
 * Updated for React Native 0.76 New Architecture using TurboModuleRegistry.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { NativeEventEmitter, Platform, TurboModuleRegistry } from 'react-native';

// Get the TurboModule
const AudioCaptureModule = TurboModuleRegistry.get('AudioCaptureModule');

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

  // Check if native module is supported (specifically for tvOS)
  const isSupported = Platform.OS === 'ios' && Platform.isTV && AudioCaptureModule != null;

  // Set up event listeners
  useEffect(() => {
    if (!isSupported || !AudioCaptureModule) {
      console.log('[AudioCapture] Module not available');
      return;
    }

    try {
      // Create event emitter with the TurboModule
      eventEmitterRef.current = new NativeEventEmitter(AudioCaptureModule as any);

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

      console.log('[AudioCapture] Event listeners set up successfully');

      // Check if already listening
      (AudioCaptureModule as any).isCurrentlyListening()
        .then((result: { listening: boolean }) => {
          setIsListening(result.listening);
        })
        .catch(() => {
          // Ignore errors checking initial state
        });

      // Cleanup subscriptions on unmount
      return () => {
        subscriptionsRef.current.forEach((sub) => sub?.remove?.());
        subscriptionsRef.current = [];
      };
    } catch (err) {
      console.error('[AudioCapture] Failed to set up event listeners:', err);
      const setupError = err instanceof Error ? err : new Error('Failed to set up audio capture');
      setError(setupError);
      onError?.(setupError);
    }
  }, [isSupported, onAudioLevel, onSpeechDetected, onSilenceDetected, onError]);

  /**
   * Start listening for audio
   */
  const startListening = useCallback(async (): Promise<void> => {
    if (!isSupported || !AudioCaptureModule) {
      throw new Error('Audio capture not supported on this platform');
    }

    try {
      setError(null);
      const result = await (AudioCaptureModule as any).startListening();

      if (result.status === 'listening' || result.status === 'already_listening') {
        setIsListening(true);
        console.log('[AudioCapture] Started listening');
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
    if (!isSupported || !AudioCaptureModule) {
      throw new Error('Audio capture not supported on this platform');
    }

    try {
      const result = await (AudioCaptureModule as any).stopListening();
      setIsListening(false);
      setAudioLevel({ average: 0, peak: 0 });

      console.log('[AudioCapture] Stopped listening');
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
    if (!isSupported || !AudioCaptureModule) {
      return { average: 0, peak: 0 };
    }

    try {
      const result = await (AudioCaptureModule as any).getAudioLevel();
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
    if (!isSupported || !AudioCaptureModule) {
      return;
    }

    try {
      await (AudioCaptureModule as any).clearBuffer();
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
