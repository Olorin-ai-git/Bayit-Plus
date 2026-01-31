/**
 * useAICompanion Hook
 *
 * Fetches and manages AI companion data for educational content.
 * Provides vocabulary, episode context, and quiz questions.
 *
 * Initial version uses pre-computed data from Content documents.
 * Future: API call to Olorin AI for dynamic generation.
 */

import { useState, useEffect, useCallback } from 'react';
import logger from '@/utils/logger';

export interface VocabularyWord {
  hebrew: string;
  transliteration: string;
  english: string;
  spanish?: string;
  partOfSpeech: string;
  context?: string;
}

export interface EpisodeContext {
  title: string;
  titleEn?: string;
  summary: string;
  summaryEn?: string;
  concepts: string[];
  relatedTopics: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  questionEn?: string;
  options: { id: string; text: string; textEn?: string }[];
  correctOptionId: string;
  explanation?: string;
}

export interface AICompanionData {
  vocabulary: VocabularyWord[];
  context: EpisodeContext | null;
  quiz: QuizQuestion[];
}

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

/**
 * Generate sample vocabulary from program title (initial implementation).
 * Future: Replace with API call to Olorin AI service.
 */
function generateSampleVocabulary(
  programTitle?: string,
  tags?: string[]
): VocabularyWord[] {
  const vocabulary: VocabularyWord[] = [];

  // Educational math vocabulary for Kan Educational
  if (programTitle?.includes('מספרים ראשוניים') || tags?.includes('prime_numbers')) {
    vocabulary.push(
      { hebrew: 'מספר ראשוני', transliteration: 'mispar rishoni', english: 'prime number', spanish: 'número primo', partOfSpeech: 'noun', context: 'A number divisible only by 1 and itself' },
      { hebrew: 'חילוק', transliteration: 'chiluk', english: 'division', spanish: 'división', partOfSpeech: 'noun', context: 'Mathematical operation' },
      { hebrew: 'כפולה', transliteration: 'kfula', english: 'multiple', spanish: 'múltiplo', partOfSpeech: 'noun', context: 'A number that can be divided evenly' },
    );
  }

  if (programTitle?.includes('חזקות') || tags?.includes('exponents')) {
    vocabulary.push(
      { hebrew: 'חזקה', transliteration: 'chazaka', english: 'power/exponent', spanish: 'potencia', partOfSpeech: 'noun', context: 'Mathematical exponent' },
      { hebrew: 'בסיס', transliteration: 'basis', english: 'base', spanish: 'base', partOfSpeech: 'noun', context: 'The number being raised to a power' },
      { hebrew: 'ריבוע', transliteration: 'ribua', english: 'square', spanish: 'cuadrado', partOfSpeech: 'noun', context: 'A number multiplied by itself' },
    );
  }

  // Default educational vocabulary
  if (vocabulary.length === 0) {
    vocabulary.push(
      { hebrew: 'למד', transliteration: 'lamad', english: 'to learn', spanish: 'aprender', partOfSpeech: 'verb', context: 'Basic learning verb' },
      { hebrew: 'תרגיל', transliteration: 'targil', english: 'exercise', spanish: 'ejercicio', partOfSpeech: 'noun', context: 'Practice activity' },
      { hebrew: 'תשובה', transliteration: 'tshuva', english: 'answer', spanish: 'respuesta', partOfSpeech: 'noun', context: 'Response to a question' },
    );
  }

  return vocabulary;
}

/**
 * Generate sample context from program metadata.
 */
function generateSampleContext(
  programTitle?: string,
  tags?: string[]
): EpisodeContext | null {
  if (!programTitle) return null;

  return {
    title: programTitle,
    titleEn: programTitle.includes('מספרים ראשוניים')
      ? 'Lost in the Square | Prime Numbers'
      : programTitle.includes('חזקות')
      ? 'Lost in the Square | Exponents'
      : 'Educational Episode',
    summary: 'תוכנית חינוכית מסדרת "אבודים בריבוע" של כאן חינוכית.',
    summaryEn: 'An educational program from the "Lost in the Square" series by Kan Educational.',
    concepts: tags || ['mathematics', 'problem-solving'],
    relatedTopics: ['algebra', 'arithmetic'],
  };
}

/**
 * Generate sample quiz questions from program metadata.
 */
function generateSampleQuiz(
  programTitle?: string,
  tags?: string[]
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  if (programTitle?.includes('מספרים ראשוניים') || tags?.includes('prime_numbers')) {
    questions.push({
      id: 'q1',
      question: 'האם 7 הוא מספר ראשוני?',
      questionEn: 'Is 7 a prime number?',
      options: [
        { id: 'a', text: 'כן', textEn: 'Yes' },
        { id: 'b', text: 'לא', textEn: 'No' },
      ],
      correctOptionId: 'a',
      explanation: '7 is only divisible by 1 and 7, making it prime.',
    });
  }

  if (programTitle?.includes('חזקות') || tags?.includes('exponents')) {
    questions.push({
      id: 'q2',
      question: 'מה התוצאה של 2³?',
      questionEn: 'What is 2³?',
      options: [
        { id: 'a', text: '6', textEn: '6' },
        { id: 'b', text: '8', textEn: '8' },
        { id: 'c', text: '9', textEn: '9' },
      ],
      correctOptionId: 'b',
      explanation: '2³ = 2 × 2 × 2 = 8',
    });
  }

  return questions;
}

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
      // Initial implementation: Generate sample data from metadata
      // Future: Replace with API call to `/api/v1/ai/companion/{contentId}`
      const vocabulary = generateSampleVocabulary(programTitle, educationalTags);
      const context = generateSampleContext(programTitle, educationalTags);
      const quiz = generateSampleQuiz(programTitle, educationalTags);

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
