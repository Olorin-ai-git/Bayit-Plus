/**
 * Sample Data Generators for AI Companion
 *
 * Generates vocabulary, context, and quiz data from program metadata.
 * Initial implementation using pattern-based generation.
 * Future: Replace with API call to Olorin AI service.
 */

import type { VocabularyWord, EpisodeContext, QuizQuestion } from './types';

/**
 * Generate vocabulary from program title and tags.
 */
export function generateVocabulary(programTitle?: string, tags?: string[]): VocabularyWord[] {
  const vocabulary: VocabularyWord[] = [];

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
 * Generate context from program metadata.
 */
export function generateContext(programTitle?: string, tags?: string[]): EpisodeContext | null {
  if (!programTitle) return null;

  const titleEn = programTitle.includes('מספרים ראשוניים')
    ? 'Lost in the Square | Prime Numbers'
    : programTitle.includes('חזקות')
    ? 'Lost in the Square | Exponents'
    : 'Educational Episode';

  return {
    title: programTitle,
    titleEn,
    summary: 'תוכנית חינוכית מסדרת "אבודים בריבוע" של כאן חינוכית.',
    summaryEn: 'An educational program from the "Lost in the Square" series by Kan Educational.',
    concepts: tags || ['mathematics', 'problem-solving'],
    relatedTopics: ['algebra', 'arithmetic'],
  };
}

/**
 * Generate quiz questions from program metadata.
 */
export function generateQuiz(programTitle?: string, tags?: string[]): QuizQuestion[] {
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
