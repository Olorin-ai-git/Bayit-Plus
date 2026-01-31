/**
 * useAICompanion Hook
 *
 * Fetches and manages AI companion data for educational content.
 * Provides vocabulary, episode context, and quiz questions.
 */

import { useState, useEffect, useCallback } from 'react';
import logger from '@/utils/logger';
import { generateVocabulary, generateContext, generateQuiz } from './sampleDataGenerators';
import type { AICompanionData, VocabularyWord, EpisodeContext, QuizQuestion } from './types';

export type { VocabularyWord, EpisodeContext, QuizQuestion, AICompanionData };

interface UseAICompanionProps {
  contentId: string | null;
  programTitle?: string;
  educationalTags?: string[];
  enabled?: boolean;
}

interface UseAICompanionResult {
  data: AICompanionData;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_DATA: AICompanionData = {
  vocabulary: [],
  context: null,
  quiz: [],
};

export function useAICompanion({
  contentId,
  programTitle,
  educationalTags,
  enabled = true,
}: UseAICompanionProps): UseAICompanionResult {
  const [data, setData] = useState<AICompanionData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !contentId) {
      setData(EMPTY_DATA);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Initial implementation: Generate data from metadata
      // Future: Replace with API call to `/api/v1/ai/companion/{contentId}`
      const vocabulary = generateVocabulary(programTitle, educationalTags);
      const context = generateContext(programTitle, educationalTags);
      const quiz = generateQuiz(programTitle, educationalTags);

      setData({ vocabulary, context, quiz });
      logger.debug('AI Companion data loaded', 'useAICompanion', { contentId });
    } catch (err: any) {
      logger.error('Failed to load AI Companion data', 'useAICompanion', err);
      setError(err.message || 'Failed to load AI learning data');
      setData(EMPTY_DATA);
    } finally {
      setIsLoading(false);
    }
  }, [contentId, programTitle, educationalTags, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
  };
}

export default useAICompanion;
