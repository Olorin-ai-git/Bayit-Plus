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

export interface CompanionMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp: number; }
export interface QuizQuestion { id: string; question: string; options: string[]; correctIndex: number; explanation: string; }
export interface VocabularyWord { word: string; transliteration: string; translation: string; audioUrl?: string; }

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

const INITIAL_STATE: UseAICompanionState = {
  visible: false, activeTab: 'context', messages: [], isLoading: false, error: null,
  quizQuestions: [], quizScore: 0, quizTotal: 0, vocabularyWords: [],
};

export function useAICompanion(contentId: string) {
  const [state, setState] = useState<UseAICompanionState>(INITIAL_STATE);
  const convIdRef = useRef<string | null>(null);

  const show = useCallback(() => { setState((p) => ({ ...p, visible: true })); log.info('Sidebar opened', { contentId }); }, [contentId]);
  const hide = useCallback(() => { setState((p) => ({ ...p, visible: false })); log.info('Sidebar closed', { contentId }); }, [contentId]);
  const setActiveTab = useCallback((tab: CompanionTab) => { setState((p) => ({ ...p, activeTab: tab })); }, []);

  const fetchContext = useCallback(async () => {
    setState((p) => ({ ...p, isLoading: true, error: null }));
    try {
      const res = await chatService.sendMessage('Provide cultural context for the current scene', convIdRef.current ?? undefined, { contentId, type: 'context' });
      convIdRef.current = res.conversation_id;
      const msg: CompanionMessage = { id: `ctx-${Date.now()}`, role: 'assistant', content: res.response || res.message, timestamp: Date.now() };
      setState((p) => ({ ...p, messages: [...p.messages, msg], isLoading: false }));
      log.info('Context fetched', { contentId });
    } catch (err) {
      setState((p) => ({ ...p, isLoading: false, error: err instanceof Error ? err.message : 'Failed to fetch context' }));
      log.error('Context fetch failed', { contentId, error: err });
    }
  }, [contentId]);

  const fetchQuiz = useCallback(async () => {
    setState((p) => ({ ...p, isLoading: true, error: null }));
    try {
      const res = await chatService.sendMessage('Generate a quiz about the current content', convIdRef.current ?? undefined, { contentId, type: 'quiz' });
      convIdRef.current = res.conversation_id;
      const questions: QuizQuestion[] = (res.quiz || []).map((q: any, i: number) => ({
        id: `q-${i}-${Date.now()}`, question: q.question, options: q.options, correctIndex: q.correct_index, explanation: q.explanation,
      }));
      setState((p) => ({ ...p, quizQuestions: questions, isLoading: false }));
      log.info('Quiz fetched', { contentId, count: questions.length });
    } catch (err) {
      setState((p) => ({ ...p, isLoading: false, error: err instanceof Error ? err.message : 'Failed to fetch quiz' }));
      log.error('Quiz fetch failed', { contentId, error: err });
    }
  }, [contentId]);

  const answerQuiz = useCallback((questionId: string, selectedIndex: number) => {
    setState((p) => {
      const q = p.quizQuestions.find((x) => x.id === questionId);
      if (!q) return p;
      return { ...p, quizScore: p.quizScore + (selectedIndex === q.correctIndex ? 1 : 0), quizTotal: p.quizTotal + 1 };
    });
  }, []);

  const fetchVocabulary = useCallback(async () => {
    setState((p) => ({ ...p, isLoading: true, error: null }));
    try {
      const res = await chatService.sendMessage('Extract Hebrew vocabulary from the current content', convIdRef.current ?? undefined, { contentId, type: 'vocabulary' });
      convIdRef.current = res.conversation_id;
      const words: VocabularyWord[] = (res.vocabulary || []).map((w: any) => ({
        word: w.word, transliteration: w.transliteration, translation: w.translation, audioUrl: w.audio_url,
      }));
      setState((p) => ({ ...p, vocabularyWords: words, isLoading: false }));
      log.info('Vocabulary fetched', { contentId, count: words.length });
    } catch (err) {
      setState((p) => ({ ...p, isLoading: false, error: err instanceof Error ? err.message : 'Failed to fetch vocabulary' }));
      log.error('Vocabulary fetch failed', { contentId, error: err });
    }
  }, [contentId]);

  const resetQuiz = useCallback(() => {
    setState((p) => ({ ...p, quizScore: 0, quizTotal: 0, quizQuestions: [] }));
  }, []);

  return {
    ...state, show, hide, setActiveTab, fetchContext, fetchQuiz, answerQuiz, fetchVocabulary, resetQuiz,
  };
}

export type UseAICompanionReturn = ReturnType<typeof useAICompanion>;
