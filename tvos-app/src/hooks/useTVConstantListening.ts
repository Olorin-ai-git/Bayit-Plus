/**
 * useTVConstantListening Hook - tvOS Native Constant Listening
 *
 * tvOS-specific implementation that wraps the native AudioCaptureModule
 * and integrates VAD detection and transcription for voice commands.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, NativeModules, NativeEventEmitter, TurboModuleRegistry } from 'react-native';
import { VADSensitivity } from '@bayit/shared-services';
import { logger } from '../utils/logger';

// Try TurboModule first, fall back to NativeModules
const turboModule = TurboModuleRegistry.get('AudioCaptureModule');
const nativeModule = NativeModules.AudioCaptureModule;
const AudioCaptureModule = turboModule ?? nativeModule;

// Only log once at startup (not on every import)
let hasLoggedModuleStatus = false;
const logModuleStatus = () => {
  if (hasLoggedModuleStatus) return;
  hasLoggedModuleStatus = true;

  if (AudioCaptureModule) {
    logger.info('AudioCaptureModule: available', { module: 'TVVoice' });
  } else {
    // This is expected on simulator - real hardware testing needed
    logger.info('AudioCaptureModule: not available (expected on simulator)', { module: 'TVVoice' });
  }
};

export interface AudioLevel {
  average: number;
  peak: number;
}

type TranscribeFunction = (audioBlob: Blob) => Promise<{ text: string }>;

export interface UseTVConstantListeningOptions {
  enabled: boolean;
  onTranscript: (text: string) => void;
  onError: (error: Error) => void;
  silenceThresholdMs?: number;
  vadSensitivity?: VADSensitivity;
  transcribeAudio?: TranscribeFunction;
}

export interface UseTVConstantListeningReturn {
  isListening: boolean;
  isProcessing: boolean;
  isSendingToServer: boolean;
  audioLevel: AudioLevel;
  start: () => Promise<void>;
  stop: () => void;
  error: Error | null;
  isSupported: boolean;
}

// VAD energy thresholds by sensitivity
const VAD_THRESHOLDS = {
  low: 0.025,
  medium: 0.015,
  high: 0.008,
};

/**
 * useTVConstantListening hook for tvOS
 */
export function useTVConstantListening(options: UseTVConstantListeningOptions): UseTVConstantListeningReturn {
  const {
    enabled,
    onTranscript,
    onError,
    silenceThresholdMs = 2000,
    vadSensitivity = 'medium',
    transcribeAudio,
  } = options;

  // State
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingToServer, setIsSendingToServer] = useState(false);
  const [audioLevel, setAudioLevel] = useState<AudioLevel>({ average: 0, peak: 0 });
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  const subscriptionsRef = useRef<any[]>([]);
  const isListeningRef = useRef(false);
  const speechDetectedRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const onErrorRef = useRef(onError);
  const onTranscriptRef = useRef(onTranscript);
  const errorReportedRef = useRef(false);

  // Keep refs up to date
  useEffect(() => {
    onErrorRef.current = onError;
    onTranscriptRef.current = onTranscript;
  }, [onError, onTranscript]);

  // Check if native module is supported
  const isSupported = Platform.OS === 'ios' && Platform.isTV && AudioCaptureModule != null;

  // VAD threshold based on sensitivity
  const vadThreshold = VAD_THRESHOLDS[vadSensitivity] || VAD_THRESHOLDS.medium;

  /**
   * Send audio to transcription API
   */
  const sendToTranscription = useCallback(async () => {
    if (!transcribeAudio || !AudioCaptureModule) return;

    setIsSendingToServer(true);

    try {
      // Stop listening and get audio file path
      const result = await (AudioCaptureModule as any).stopListening();
      const audioFilePath = result.audioFilePath;

      if (!audioFilePath) {
        logger.debug('No audio captured', { module: 'TVVoice' });
        // Restart listening
        await (AudioCaptureModule as any).startListening();
        setIsSendingToServer(false);
        return;
      }

      // Read audio file and create blob
      const response = await fetch(`file://${audioFilePath}`);
      const audioBlob = await response.blob();

      // Skip if audio is too short
      if (audioBlob.size < 16000) {
        logger.debug('Audio too short, skipping', { module: 'TVVoice', size: audioBlob.size });
        await (AudioCaptureModule as any).startListening();
        setIsSendingToServer(false);
        return;
      }

      logger.info('Sending audio for transcription...', { module: 'TVVoice', size: audioBlob.size });
      const transcriptionResult = await transcribeAudio(audioBlob);

      if (transcriptionResult.text && transcriptionResult.text.trim()) {
        logger.info('Transcript received', { module: 'TVVoice', text: transcriptionResult.text });
        onTranscriptRef.current?.(transcriptionResult.text.trim());
      }

      // Restart listening
      await (AudioCaptureModule as any).startListening();
    } catch (err) {
      const transcriptionError = err instanceof Error ? err : new Error('Transcription failed');
      logger.error('Transcription error', { module: 'TVVoice', error: transcriptionError });
      onErrorRef.current?.(transcriptionError);

      // Try to restart listening
      try {
        await (AudioCaptureModule as any).startListening();
      } catch {
        // Ignore restart errors
      }
    } finally {
      setIsSendingToServer(false);
      setIsProcessing(false);
      speechDetectedRef.current = false;
    }
  }, [transcribeAudio]);

  /**
   * Process audio level and detect speech/silence
   */
  const processAudioLevel = useCallback((level: AudioLevel) => {
    setAudioLevel(level);

    if (!isListeningRef.current) return;

    const isSpeech = level.average > vadThreshold;

    if (isSpeech) {
      // Speech detected
      if (!speechDetectedRef.current) {
        logger.debug('Speech detected', { module: 'TVVoice' });
        speechDetectedRef.current = true;
        setIsProcessing(true);
      }
      lastSpeechTimeRef.current = Date.now();

      // Clear any silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else if (speechDetectedRef.current) {
      // Silence after speech - start timer
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          logger.debug('Silence detected, sending to transcription', { module: 'TVVoice' });
          sendToTranscription();
          silenceTimerRef.current = null;
        }, silenceThresholdMs);
      }
    }
  }, [vadThreshold, silenceThresholdMs, sendToTranscription]);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    // Log module status once
    logModuleStatus();

    if (!isSupported || !AudioCaptureModule) {
      // Don't report as error - this is expected on simulator
      // Real hardware testing needed for voice features
      return;
    }

    try {
      // Create event emitter with the TurboModule
      eventEmitterRef.current = new NativeEventEmitter(AudioCaptureModule as any);

      // Subscribe to audio level events
      const levelSubscription = eventEmitterRef.current.addListener(
        'onAudioLevel',
        (data: { average: number; peak: number }) => {
          processAudioLevel({
            average: data.average,
            peak: data.peak,
          });
        }
      );

      // Subscribe to error events
      const errorSubscription = eventEmitterRef.current.addListener(
        'onError',
        (err: { message: string }) => {
          const captureError = new Error(err.message);
          setError(captureError);
          onErrorRef.current?.(captureError);
        }
      );

      subscriptionsRef.current = [levelSubscription, errorSubscription];

      logger.info('Event listeners set up', { module: 'TVVoice' });

      return () => {
        subscriptionsRef.current.forEach((sub) => sub?.remove?.());
        subscriptionsRef.current = [];
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };
    } catch (err) {
      const setupError = err instanceof Error ? err : new Error('Failed to set up audio capture');
      logger.error('Setup error', { module: 'TVVoice', error: setupError });
      setError(setupError);
      onErrorRef.current?.(setupError);
    }
  }, [isSupported, processAudioLevel, enabled]);

  /**
   * Start listening
   */
  const start = useCallback(async () => {
    if (!isSupported || !AudioCaptureModule) {
      // Silently return - this is expected on simulator
      return;
    }

    if (isListeningRef.current) return;

    try {
      setError(null);
      const result = await (AudioCaptureModule as any).startListening();

      if (result.status === 'listening' || result.status === 'already_listening') {
        isListeningRef.current = true;
        setIsListening(true);
        logger.info('Started listening', { module: 'TVVoice' });
      }
    } catch (err: any) {
      const startError = new Error(err.message || 'Failed to start listening');
      setError(startError);
      onErrorRef.current?.(startError);
    }
  }, [isSupported]);

  /**
   * Stop listening
   */
  const stop = useCallback(async () => {
    if (!AudioCaptureModule) return;

    isListeningRef.current = false;
    setIsListening(false);
    setIsProcessing(false);
    setAudioLevel({ average: 0, peak: 0 });
    speechDetectedRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    try {
      await (AudioCaptureModule as any).stopListening();
      logger.info('Stopped listening', { module: 'TVVoice' });
    } catch {
      // Ignore stop errors
    }
  }, []);

  // Auto-start/stop based on enabled state
  useEffect(() => {
    if (enabled && !isListeningRef.current && isSupported) {
      start();
    } else if (!enabled && isListeningRef.current) {
      stop();
    }

    return () => {
      if (isListeningRef.current) {
        stop();
      }
    };
  }, [enabled, isSupported, start, stop]);

  return {
    isListening,
    isProcessing,
    isSendingToServer,
    audioLevel,
    start,
    stop,
    error,
    isSupported,
  };
}

export default useTVConstantListening;
