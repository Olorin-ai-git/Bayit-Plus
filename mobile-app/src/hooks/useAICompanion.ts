/**
 * useAICompanion - State hook for AI Companion sidebar
 *
 * Manages sidebar visibility, active tab, and AI chat messages
 * for contextual learning features during content playback.
 */

import { useState, useCallback, useRef } from 'react';
import { chatService } from '@bayit/shared-services/api';
import { logger } from '../utils/logger';

const log = logger.scope('useAICompanion');

export type CompanionTab = 'context' | 'quiz' | 'vocabulary';

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface VocabularyWord {
  word: string;
  transliteration: string;
  translation: string;
  audioUrl?: string;
}

export interface UseAICompanionState {
  visible: boolean;
  activeTab: CompanionTab;
  messages: CompanionMessage[];
  isLoading: boolean;
  error: string | null;
  quizQuestions: QuizQuestion[];
  quizScore: number;
  quizTotal: number;
  vocabularyWords: VocabularyWord[];
}

export function useAICompanion(contentId: string) {
  const [state, setState] = useState<UseAICompanionState>({
    visible: false,
    activeTab: 'context',
    messages: [],
    isLoading: false,
    error: null,
    quizQuestions: [],
    quizScore: 0,
    quizTotal: 0,
    vocabularyWords: [],
  });

  const conversationIdRef = useRef<string | null>(null);

  const show = useCallback(() => {
    setState((prev) => ({ ...prev, visible: true }));
    log.info('Companion sidebar opened', { contentId });
  }, [contentId]);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
    log.info('Companion sidebar closed', { contentId });
  }, [contentId]);

  const setActiveTab = useCallback((tab: CompanionTab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const fetchContext = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await chatService.sendMessage(
        'Provide cultural context for the current scene',
        conversationIdRef.current ?? undefined,
        { contentId, type: 'context' },
      );
      conversationIdRef.current = response.conversation_id;
      const assistantMsg: CompanionMessage = {
        id: `ctx-${Date.now()}`,
        role: 'assistant',
        content: response.response || response.message,
        timestamp: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        isLoading: false,
      }));
      log.info('Context fetched', { contentId });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch context';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      log.error('Context fetch failed', { contentId, error: err });
    }
  }, [contentId]);

  const fetchQuiz = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await chatService.sendMessage(
        'Generate a quiz about the current content',
        conversationIdRef.current ?? undefined,
        { contentId, type: 'quiz' },
      );
      conversationIdRef.current = response.conversation_id;
      const questions: QuizQuestion[] = (response.quiz || []).map(
        (q: any, idx: number) => ({
          id: `q-${idx}-${Date.now()}`,
          question: q.question,
          options: q.options,
          correctIndex: q.correct_index,
          explanation: q.explanation,
        }),
      );
      setState((prev) => ({
        ...prev,
        quizQuestions: questions,
        isLoading: false,
      }));
      log.info('Quiz fetched', { contentId, questionCount: questions.length });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch quiz';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      log.error('Quiz fetch failed', { contentId, error: err });
    }
  }, [contentId]);

  const answerQuiz = useCallback((questionId: string, selectedIndex: number) => {
    setState((prev) => {
      const question = prev.quizQuestions.find((q) => q.id === questionId);
      if (!question) return prev;
      const isCorrect = selectedIndex === question.correctIndex;
      return {
        ...prev,
        quizScore: prev.quizScore + (isCorrect ? 1 : 0),
        quizTotal: prev.quizTotal + 1,
      };
    });
  }, []);

  const fetchVocabulary = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await chatService.sendMessage(
        'Extract Hebrew vocabulary from the current content',
        conversationIdRef.current ?? undefined,
        { contentId, type: 'vocabulary' },
      );
      conversationIdRef.current = response.conversation_id;
      const words: VocabularyWord[] = (response.vocabulary || []).map(
        (w: any) => ({
          word: w.word,
          transliteration: w.transliteration,
          translation: w.translation,
          audioUrl: w.audio_url,
        }),
      );
      setState((prev) => ({
        ...prev,
        vocabularyWords: words,
        isLoading: false,
      }));
      log.info('Vocabulary fetched', { contentId, wordCount: words.length });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch vocabulary';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      log.error('Vocabulary fetch failed', { contentId, error: err });
    }
  }, [contentId]);

  const resetQuiz = useCallback(() => {
    setState((prev) => ({
      ...prev,
      quizScore: 0,
      quizTotal: 0,
      quizQuestions: [],
    }));
  }, []);

  return {
    ...state,
    show,
    hide,
    setActiveTab,
    fetchContext,
    fetchQuiz,
    answerQuiz,
    fetchVocabulary,
    resetQuiz,
  };
}

export type UseAICompanionReturn = ReturnType<typeof useAICompanion>;
