/**
 * Transcription logic for useTVConstantListening
 *
 * Handles stopping capture, reading audio, sending to transcription API,
 * and restarting listening.
 */

import { useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import type { TranscribeFunction } from './types/tvConstantListening.types';

interface TranscriptionCallbacks {
  onTranscript: React.MutableRefObject<(text: string) => void>;
  onError: React.MutableRefObject<(error: Error) => void>;
  setIsSendingToServer: (v: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  speechDetectedRef: React.MutableRefObject<boolean>;
}

/**
 * Hook that encapsulates the transcription send/receive cycle
 */
export function useTranscriptionSender(
  AudioCaptureModule: any,
  transcribeAudio: TranscribeFunction | undefined,
  callbacks: TranscriptionCallbacks,
) {
  const { onTranscript, onError, setIsSendingToServer, setIsProcessing, speechDetectedRef } = callbacks;

  const sendToTranscription = useCallback(async () => {
    if (!transcribeAudio || !AudioCaptureModule) return;

    setIsSendingToServer(true);

    try {
      const result = await AudioCaptureModule.stopListening();
      const audioFilePath = result.audioFilePath;

      if (!audioFilePath) {
        logger.debug('No audio captured', { module: 'TVVoice' });
        await AudioCaptureModule.startListening();
        setIsSendingToServer(false);
        return;
      }

      const response = await fetch(`file://${audioFilePath}`);
      const audioBlob = await response.blob();

      if (audioBlob.size < 16000) {
        logger.debug('Audio too short, skipping', { module: 'TVVoice', size: audioBlob.size });
        await AudioCaptureModule.startListening();
        setIsSendingToServer(false);
        return;
      }

      logger.info('Sending audio for transcription...', { module: 'TVVoice', size: audioBlob.size });
      const transcriptionResult = await transcribeAudio(audioBlob);

      if (transcriptionResult.text && transcriptionResult.text.trim()) {
        logger.info('Transcript received', { module: 'TVVoice', text: transcriptionResult.text });
        onTranscript.current?.(transcriptionResult.text.trim());
      }

      await AudioCaptureModule.startListening();
    } catch (err) {
      const transcriptionError = err instanceof Error ? err : new Error('Transcription failed');
      logger.error('Transcription error', { module: 'TVVoice', error: transcriptionError });
      onError.current?.(transcriptionError);

      try {
        await AudioCaptureModule.startListening();
      } catch {
        // Ignore restart errors
      }
    } finally {
      setIsSendingToServer(false);
      setIsProcessing(false);
      speechDetectedRef.current = false;
    }
  }, [AudioCaptureModule, transcribeAudio, onTranscript, onError, setIsSendingToServer, setIsProcessing, speechDetectedRef]);

  return sendToTranscription;
}
