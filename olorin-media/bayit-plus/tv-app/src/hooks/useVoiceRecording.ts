import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { chatService } from '../services/api';
import logger from '../utils/logger';

type VoiceRecordingError = 'noMicrophone' | 'transcribeError' | 'recordingError' | 'notSupported';

interface UseVoiceRecordingOptions {
  onTranscribed?: (text: string) => void;
  onError?: (error: VoiceRecordingError) => void;
  autoTranscribe?: boolean;
}

interface UseVoiceRecordingReturn {
  // State
  isRecording: boolean;
  isTranscribing: boolean;
  transcribedText: string;
  error: VoiceRecordingError | null;
  hasPermission: boolean | null;
  isSupported: boolean;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleRecording: () => void;
  cancelRecording: () => void;
  requestPermission: () => Promise<boolean>;
  clearTranscription: () => void;
  transcribeAudio: (audioBlob: Blob) => Promise<string>;
}

/**
 * useVoiceRecording hook
 * Provides voice recording and transcription functionality
 * Works on web platforms, with fallback messaging for native
 */
export function useVoiceRecording(options: UseVoiceRecordingOptions = {}): UseVoiceRecordingReturn {
  const {
    onTranscribed,
    onError,
    autoTranscribe = true,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<VoiceRecordingError | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if platform supports MediaRecorder
  const isSupported = Platform.OS === 'web' &&
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setHasPermission(false);
      setError('notSupported');
      onError?.('notSupported');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (err) {
      logger.error('Failed to get microphone permission', 'useVoiceRecording', err);
      setHasPermission(false);
      setError('noMicrophone');
      onError?.('noMicrophone');
      return false;
    }
  }, [isSupported, onError]);

  // Transcribe audio blob
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    setIsTranscribing(true);
    setError(null);

    try {
      const response = await chatService.transcribeAudio(audioBlob);
      const text = response?.text || '';

      setTranscribedText(text);
      onTranscribed?.(text);

      return text;
    } catch (err) {
      logger.error('Transcription failed', 'useVoiceRecording', err);
      setError('transcribeError');
      onError?.('transcribeError');
      return '';
    } finally {
      setIsTranscribing(false);
    }
  }, [onTranscribed, onError]);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    if (isRecording) return;

    if (!isSupported) {
      setError('notSupported');
      onError?.('notSupported');
      return;
    }

    setError(null);
    setTranscribedText('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        // Create blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Auto-transcribe if enabled
        if (autoTranscribe && audioBlob.size > 0) {
          await transcribeAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setHasPermission(true);
    } catch (err) {
      logger.error('Failed to start recording', 'useVoiceRecording', err);
      setError('recordingError');
      setHasPermission(false);
      onError?.('recordingError');
    }
  }, [isRecording, isSupported, autoTranscribe, transcribeAudio, onError]);

  // Stop recording
  const stopRecording = useCallback((): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Toggle recording (for single button use)
  const toggleRecording = useCallback((): void => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cancel recording without transcribing
  const cancelRecording = useCallback((): void => {
    if (mediaRecorderRef.current && isRecording) {
      // Clear chunks before stopping
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isRecording]);

  // Clear transcribed text
  const clearTranscription = useCallback((): void => {
    setTranscribedText('');
  }, []);

  return {
    // State
    isRecording,
    isTranscribing,
    transcribedText,
    error,
    hasPermission,
    isSupported,

    // Actions
    startRecording,
    stopRecording,
    toggleRecording,
    cancelRecording,
    requestPermission,
    clearTranscription,
    transcribeAudio,
  };
}

export default useVoiceRecording;
