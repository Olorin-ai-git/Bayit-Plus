/**
 * AI Companion Types
 *
 * Shared type definitions for AI Companion components.
 */

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
