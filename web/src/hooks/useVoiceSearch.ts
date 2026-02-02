/**
 * useVoiceSearch Hook
 *
 * Bridges VoiceSearchButton → STT API → search query
 * Handles audio transcription with multi-language support (Hebrew, English, Spanish)
 *
 * Uses centralized chatService from api.js for auth token injection,
 * correlation ID tracking, retry logic, and consistent error handling.
 */

import { useState, useCallback } from 'react';
import { chatService } from '@/services/api';
import logger from '../../../shared/utils/logger';

const LOG_CONTEXT = 'useVoiceSearch';

interface TranscriptionResponse {
  text: string;
  language?: string;
  confidence?: number;
}

interface UseVoiceSearchOptions {
  /** Callback when transcription completes successfully */
  onTranscriptionComplete: (text: string) => void;
  /** Default language for transcription (he, en, es) */
  defaultLanguage?: 'he' | 'en' | 'es';
  /** Custom error handler */
  onError?: (error: Error) => void;
}

interface UseVoiceSearchReturn {
  /** Current recording state */
  isRecording: boolean;
  /** Current transcription processing state */
  isTranscribing: boolean;
  /** Error message if transcription failed */
  error: string | null;
  /** Function to transcribe audio blob */
  transcribe: (audioBlob: Blob, language?: string) => Promise<{ text: string }>;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Hook for voice search functionality
 * Provides transcription integration for VoiceSearchButton component
 *
 * @example
 * ```tsx
 * const { transcribe, isTranscribing, error } = useVoiceSearch({
 *   onTranscriptionComplete: (text) => setSearchQuery(text),
 *   defaultLanguage: 'he',
 * });
 *
 * <VoiceSearchButton
 *   onResult={(text) => setSearchQuery(text)}
 *   transcribeAudio={transcribe}
 * />
 * ```
 */
export function useVoiceSearch(options: UseVoiceSearchOptions): UseVoiceSearchReturn {
  const {
    onTranscriptionComplete,
    defaultLanguage = 'he',
    onError,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Transcribe audio blob using centralized chatService
   * Provides auth token injection, correlation ID tracking, and retry logic
   */
  const transcribe = useCallback(
    async (audioBlob: Blob, language?: string): Promise<{ text: string }> => {
      setIsTranscribing(true);
      setError(null);

      try {
        const transcriptionLanguage = language || defaultLanguage;

        logger.info(
          `Transcribing audio (${transcriptionLanguage})`,
          LOG_CONTEXT,
          { size: audioBlob.size, type: audioBlob.type }
        );

        // Use centralized chatService for auth token injection
        const data = await chatService.transcribeAudio(audioBlob, transcriptionLanguage);

        if (!data.text?.trim()) {
          throw new Error('No text received from transcription');
        }

        logger.info(
          'Transcription successful',
          LOG_CONTEXT,
          {
            textLength: data.text.length,
            language: data.language,
            confidence: data.confidence,
          }
        );

        // Call completion callback
        onTranscriptionComplete(data.text.trim());

        return { text: data.text.trim() };
      } catch (err: any) {
        logger.error('Transcription failed', LOG_CONTEXT, err);

        const errorMessage =
          err.message || 'Failed to transcribe audio. Please try again.';
        setError(errorMessage);

        // Call custom error handler if provided
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }

        throw err;
      } finally {
        setIsTranscribing(false);
      }
    },
    [defaultLanguage, onTranscriptionComplete, onError]
  );

  return {
    isRecording,
    isTranscribing,
    error,
    transcribe,
    clearError,
  };
}
