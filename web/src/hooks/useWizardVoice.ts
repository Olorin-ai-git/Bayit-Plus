/**
 * Wizard Voice Hook (Web Platform)
 * Integrates voice recording with wizard backend at /api/v1/voice/unified
 *
 * This hook provides wizard-specific voice interactions for web platform,
 * using the centralized API via wizardService.ts
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import type { GestureState } from '@bayit/shared/stores/supportStore';
import { sendVoiceCommand } from '@/services/wizardService';
import type { WizardVoiceResponse } from '@/services/wizardService';
import { ttsService } from '@bayit/shared-services';
import i18n from '@bayit/shared-i18n';
import logger from '@/utils/logger';

const wizardLogger = logger.scope('WizardVoice');

interface UseWizardVoiceReturn {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  currentTranscript: string;
  lastResponse: string;
  error: string | null;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  resetConversation: () => void;
}

export function useWizardVoice(): UseWizardVoiceReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationIdRef = useRef<string | null>(null);

  const { setGestureState, setVoiceState } = useSupportStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsRecording(true);
      setVoiceState('listening');

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        await processRecording();
      };

      mediaRecorder.start(250); // Collect data every 250ms

      wizardLogger.info('Recording started', {
        mimeType,
        language: i18n.language,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMsg);
      setIsRecording(false);
      setVoiceState('error');
      wizardLogger.error('Recording start failed', { error: errorMsg });
    }
  }, [setVoiceState]);

  /**
   * Stop recording and process
   */
  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  /**
   * Cancel recording without processing
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setVoiceState('idle');
    wizardLogger.info('Recording cancelled');
  }, [setVoiceState]);

  /**
   * Process recorded audio through wizard backend
   */
  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      setVoiceState('idle');
      return;
    }

    try {
      setIsProcessing(true);
      setVoiceState('processing');

      // Create audio blob
      const mimeType = getSupportedMimeType();
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      // Check minimum size
      if (audioBlob.size < 1000) {
        wizardLogger.warn('Audio too short', { size: audioBlob.size });
        setVoiceState('idle');
        setIsProcessing(false);
        return;
      }

      // Transcribe audio
      const transcript = await transcribeAudio(audioBlob);

      if (!transcript || transcript.trim().length === 0) {
        wizardLogger.warn('Empty transcript');
        setVoiceState('idle');
        setIsProcessing(false);
        return;
      }

      setCurrentTranscript(transcript);
      wizardLogger.info('Transcript received', {
        transcript: transcript.substring(0, 50),
        length: transcript.length
      });

      // Call wizard backend
      const wizardResponse = await sendVoiceCommand({
        transcript,
        language: i18n.language || 'en',
        conversation_id: conversationIdRef.current || undefined,
        platform: 'web',
        trigger_type: 'manual',
      });

      // Store conversation ID
      conversationIdRef.current = wizardResponse.conversation_id;

      // Update gesture state
      if (wizardResponse.gesture) {
        setGestureState(wizardResponse.gesture.gesture as GestureState);
      }

      // Handle action
      if (wizardResponse.action) {
        handleWizardAction(wizardResponse.action);
      }

      setLastResponse(wizardResponse.spoken_response);
      wizardLogger.info('Wizard response received', {
        intent: wizardResponse.intent,
        confidence: wizardResponse.confidence,
        hasGesture: !!wizardResponse.gesture,
        hasAction: !!wizardResponse.action,
      });

      // Speak response
      setIsSpeaking(true);
      setVoiceState('speaking');
      await speakResponse(wizardResponse.spoken_response);

      setIsSpeaking(false);
      setVoiceState('idle');
      setIsProcessing(false);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMsg);
      setIsProcessing(false);
      setVoiceState('error');
      wizardLogger.error('Processing failed', { error: errorMsg });

      // Show error briefly then reset
      setTimeout(() => {
        setVoiceState('idle');
        setError(null);
      }, 3000);
    }
  };

  /**
   * Transcribe audio using backend STT
   */
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    const extension = getFileExtension();
    formData.append('audio', audioBlob, `recording.${extension}`);
    formData.append('language', i18n.language || 'en');

    const response = await fetch('/api/v1/support/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const data = await response.json();
    return data.transcript || '';
  };

  /**
   * Speak wizard response using TTS
   */
  const speakResponse = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      ttsService.speak(text, 'high', {
        onComplete: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  };

  /**
   * Handle wizard action (navigate, search, play)
   */
  const handleWizardAction = (action: { type: string; payload: Record<string, any> }) => {
    wizardLogger.info('Wizard action', { type: action.type, payload: action.payload });

    // Emit custom event for UI to handle
    window.dispatchEvent(new CustomEvent('wizard:action', {
      detail: action,
    }));
  };

  /**
   * Reset conversation context
   */
  const resetConversation = useCallback(() => {
    conversationIdRef.current = null;
    setCurrentTranscript('');
    setLastResponse('');
    setError(null);
    wizardLogger.info('Conversation reset');
  }, []);

  return {
    isRecording,
    isProcessing,
    isSpeaking,
    currentTranscript,
    lastResponse,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    resetConversation,
  };
}

/**
 * Get supported MIME type for recording
 */
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'audio/webm';
}

/**
 * Get file extension based on MIME type
 */
function getFileExtension(): string {
  const mimeType = getSupportedMimeType();
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'webm';
}

export default useWizardVoice;
