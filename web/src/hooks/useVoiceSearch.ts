/**
 * useVoiceSearch Hook
 *
 * Bridges VoiceSearchButton → STT API → search query
 * Handles audio transcription with multi-language support (Hebrew, English, Spanish)
 */

import { useState, useCallback, useRef } from 'react';
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
 * Get API base URL from environment
 */
const getApiBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    logger.error('VITE_API_URL not configured', LOG_CONTEXT);
    throw new Error('API URL not configured. Set VITE_API_URL in environment.');
  }
  return apiUrl;
};

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

  // Abort controller for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Transcribe audio blob using STT API
   */
  const transcribe = useCallback(
    async (audioBlob: Blob, language?: string): Promise<{ text: string }> => {
      // Abort previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsTranscribing(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      try {
        const baseUrl = getApiBaseUrl();
        const transcriptionLanguage = language || defaultLanguage;

        // Prepare form data
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', transcriptionLanguage);

        logger.info(
          `Transcribing audio (${transcriptionLanguage})`,
          LOG_CONTEXT,
          { size: audioBlob.size, type: audioBlob.type }
        );

        // Send to STT API
        const response = await fetch(`${baseUrl}/chat/transcribe`, {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.detail || `Transcription failed: ${response.statusText}`
          );
        }

        const data: TranscriptionResponse = await response.json();

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
        // Ignore aborted requests
        if (err.name === 'AbortError') {
          logger.debug('Transcription request aborted', LOG_CONTEXT);
          return { text: '' };
        }

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
        abortControllerRef.current = null;
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
