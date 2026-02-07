/**
 * useTVConstantListening Hook - tvOS Native Constant Listening
 *
 * tvOS-specific implementation that wraps the native AudioCaptureModule
 * and integrates VAD detection and transcription for voice commands.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, NativeEventEmitter } from 'react-native';
import { logger } from '../utils/logger';
import { VAD_THRESHOLDS } from './constants/tvConstantListening';
import { AudioCaptureModule, logModuleStatus } from './helpers/tvConstantListeningHelpers';
import { useTranscriptionSender } from './useTVConstantListeningTranscription';
import type {
  AudioLevel,
  UseTVConstantListeningOptions,
  UseTVConstantListeningReturn,
} from './types/tvConstantListening.types';

// Re-export types for backward compatibility
export type { AudioLevel, UseTVConstantListeningOptions, UseTVConstantListeningReturn };

/** useTVConstantListening hook for tvOS */
export function useTVConstantListening(options: UseTVConstantListeningOptions): UseTVConstantListeningReturn {
  const { enabled, onTranscript, onError, silenceThresholdMs = 2000, vadSensitivity = 'medium', transcribeAudio } = options;

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingToServer, setIsSendingToServer] = useState(false);
  const [audioLevel, setAudioLevel] = useState<AudioLevel>({ average: 0, peak: 0 });
  const [error, setError] = useState<Error | null>(null);

  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  const subscriptionsRef = useRef<any[]>([]);
  const isListeningRef = useRef(false);
  const speechDetectedRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onErrorRef = useRef(onError);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => { onErrorRef.current = onError; onTranscriptRef.current = onTranscript; }, [onError, onTranscript]);

  const isSupported = Platform.OS === 'ios' && Platform.isTV && AudioCaptureModule != null;
  const vadThreshold = VAD_THRESHOLDS[vadSensitivity] || VAD_THRESHOLDS.medium;

  const sendToTranscription = useTranscriptionSender(
    AudioCaptureModule, transcribeAudio,
    { onTranscript: onTranscriptRef, onError: onErrorRef, setIsSendingToServer, setIsProcessing, speechDetectedRef },
  );

  const processAudioLevel = useCallback((level: AudioLevel) => {
    setAudioLevel(level);
    if (!isListeningRef.current) return;
    const isSpeech = level.average > vadThreshold;
    if (isSpeech) {
      if (!speechDetectedRef.current) { logger.debug('Speech detected', { module: 'TVVoice' }); speechDetectedRef.current = true; setIsProcessing(true); }
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    } else if (speechDetectedRef.current && !silenceTimerRef.current) {
      silenceTimerRef.current = setTimeout(() => {
        logger.debug('Silence detected, sending to transcription', { module: 'TVVoice' });
        sendToTranscription();
        silenceTimerRef.current = null;
      }, silenceThresholdMs);
    }
  }, [vadThreshold, silenceThresholdMs, sendToTranscription]);

  useEffect(() => {
    logModuleStatus();
    if (!isSupported || !AudioCaptureModule) return;
    try {
      eventEmitterRef.current = new NativeEventEmitter(AudioCaptureModule as any);
      const levelSub = eventEmitterRef.current.addListener('onAudioLevel', (data: { average: number; peak: number }) => {
        processAudioLevel({ average: data.average, peak: data.peak });
      });
      const errorSub = eventEmitterRef.current.addListener('onError', (err: { message: string }) => {
        const captureError = new Error(err.message); setError(captureError); onErrorRef.current?.(captureError);
      });
      subscriptionsRef.current = [levelSub, errorSub];
      logger.info('Event listeners set up', { module: 'TVVoice' });
      return () => { subscriptionsRef.current.forEach((sub) => sub?.remove?.()); subscriptionsRef.current = []; if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); };
    } catch (err) {
      const setupError = err instanceof Error ? err : new Error('Failed to set up audio capture');
      logger.error('Setup error', { module: 'TVVoice', error: setupError }); setError(setupError); onErrorRef.current?.(setupError);
    }
  }, [isSupported, processAudioLevel, enabled]);

  const start = useCallback(async () => {
    if (!isSupported || !AudioCaptureModule || isListeningRef.current) return;
    try {
      setError(null);
      const result = await (AudioCaptureModule as any).startListening();
      if (result.status === 'listening' || result.status === 'already_listening') { isListeningRef.current = true; setIsListening(true); logger.info('Started listening', { module: 'TVVoice' }); }
    } catch (err: any) { const startError = new Error(err.message || 'Failed to start listening'); setError(startError); onErrorRef.current?.(startError); }
  }, [isSupported]);

  const stop = useCallback(async () => {
    if (!AudioCaptureModule) return;
    isListeningRef.current = false; setIsListening(false); setIsProcessing(false); setAudioLevel({ average: 0, peak: 0 }); speechDetectedRef.current = false;
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    try { await (AudioCaptureModule as any).stopListening(); logger.info('Stopped listening', { module: 'TVVoice' }); } catch { /* Ignore stop errors */ }
  }, []);

  useEffect(() => {
    if (enabled && !isListeningRef.current && isSupported) start();
    else if (!enabled && isListeningRef.current) stop();
    return () => { if (isListeningRef.current) stop(); };
  }, [enabled, isSupported, start, stop]);

  return { isListening, isProcessing, isSendingToServer, audioLevel, start, stop, error, isSupported };
}

export default useTVConstantListening;
