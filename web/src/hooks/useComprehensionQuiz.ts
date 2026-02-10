/**
 * useComprehensionQuiz Hook
 *
 * Manages comprehension quiz state and API interactions.
 * Fetches questions and submits answers with beta credit tracking.
 */

import { useCallback, useState } from 'react';
import api from '../services/api';
import { logger } from '../utils/logger';

export interface ComprehensionQuestion {
  question_id: string;
  question_text: string;
  question_text_en?: string;
  options: string[];
  options_en?: string[];
  scene_start_time: number;
  scene_end_time: number;
  difficulty: string;
  points: number;
}

export interface SubmitResult {
  is_correct: boolean;
  explanation?: string;
  explanation_en?: string;
  points_earned: number;
  credits_deducted: number;
}

export interface UseComprehensionQuizReturn {
  question: ComprehensionQuestion | null;
  isLoading: boolean;
  error: string | null;
  fetchQuestion: (
    sceneStart: number,
    sceneEnd: number,
    language?: string
  ) => Promise<void>;
  submitAnswer: (
    questionId: string,
    optionIndex: number,
    timeTaken: number
  ) => Promise<SubmitResult>;
  clearQuestion: () => void;
}

export const useComprehensionQuiz = (
  contentId: string
): UseComprehensionQuizReturn => {
  const [question, setQuestion] = useState<ComprehensionQuestion | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestion = useCallback(
    async (
      sceneStart: number,
      sceneEnd: number,
      language: string = 'he'
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get(
          `/api/v1/comprehension/${contentId}/question`,
          {
            params: {
              scene_start: sceneStart,
              scene_end: sceneEnd,
              language,
            },
          }
        );
        setQuestion(response as any);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError('Insufficient credits for comprehension question');
        } else if (err.response?.status === 404) {
          setError('Question not found for this scene');
        } else {
          setError('Failed to load question');
        }
        logger.error('Failed to fetch comprehension question', 'useComprehensionQuiz', err);
      } finally {
        setIsLoading(false);
      }
    },
    [contentId]
  );

  const submitAnswer = useCallback(
    async (
      questionId: string,
      optionIndex: number,
      timeTaken: number
    ): Promise<SubmitResult> => {
      try {
        const response = await api.post(
          `/api/v1/comprehension/questions/${questionId}/submit`,
          {
            selected_option: optionIndex,
            time_taken_ms: timeTaken,
          }
        );
        return response as unknown as SubmitResult;
      } catch (err: any) {
        logger.error('Failed to submit comprehension answer', 'useComprehensionQuiz', err);
        throw err;
      }
    },
    []
  );

  const clearQuestion = useCallback(() => {
    setQuestion(null);
    setError(null);
  }, []);

  return {
    question,
    isLoading,
    error,
    fetchQuestion,
    submitAnswer,
    clearQuestion,
  };
};
