/**
 * Quiz Store
 * Manages state for kids quiz feature during quiz sessions.
 */

import { create } from 'zustand';

export interface QuizQuestion {
  question_id: string;
  question_text: string;
  question_text_en?: string;
  options: string[];
  options_en?: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  explanation?: string;
  explanation_en?: string;
}

export interface Quiz {
  quiz_id: string;
  content_id: string;
  content_type: 'vod' | 'series_episode';
  questions: QuizQuestion[];
  age_group: 'toddlers' | 'preschool' | 'elementary' | 'preteen';
  language: string;
  total_questions: number;
  max_points: number;
}

export interface AnswerRecord {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface QuizResult {
  attempt_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  points_earned: number;
  new_badges: Array<{
    badge_id: string;
    name: string;
    name_he: string;
    icon_url: string;
    rarity: string;
    points_bonus: number;
  }>;
  total_points: number;
  streak_days: number;
  is_perfect: boolean;
}

interface QuizState {
  currentQuiz: Quiz | null;
  currentQuestionIndex: number;
  answers: AnswerRecord[];
  questionStartTime: number | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  result: QuizResult | null;
  showOverlay: boolean;
}

interface QuizActions {
  fetchQuiz: (contentId: string, profileId: string) => Promise<Quiz | null>;
  startQuiz: (quiz: Quiz) => void;
  selectAnswer: (optionIndex: number) => void;
  nextQuestion: () => void;
  submitQuiz: (quizId: string, profileId: string) => Promise<QuizResult | null>;
  resetQuiz: () => void;
  showQuizOverlay: () => void;
  hideQuizOverlay: () => void;
  setError: (error: string | null) => void;
}

export type QuizStore = QuizState & QuizActions;

const initialState: QuizState = {
  currentQuiz: null,
  currentQuestionIndex: 0,
  answers: [],
  questionStartTime: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  result: null,
  showOverlay: false,
};

export const useQuizStore = create<QuizStore>((set, get) => ({
  ...initialState,

  fetchQuiz: async (contentId: string, profileId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { quizService } = await import('../services/quizService');
      const quiz = await quizService.getQuiz(contentId, profileId);
      set({ isLoading: false });
      return quiz;
    } catch (error: any) {
      const message = error?.message || 'Failed to load quiz';
      set({ isLoading: false, error: message });
      return null;
    }
  },

  startQuiz: (quiz: Quiz) => {
    set({
      currentQuiz: quiz,
      currentQuestionIndex: 0,
      answers: [],
      questionStartTime: Date.now(),
      result: null,
      error: null,
      showOverlay: true,
    });
  },

  selectAnswer: (optionIndex: number) => {
    const { currentQuiz, currentQuestionIndex, answers, questionStartTime } = get();
    if (!currentQuiz || currentQuestionIndex >= currentQuiz.questions.length) return;

    const question = currentQuiz.questions[currentQuestionIndex];
    const isCorrect = optionIndex === question.correct_index;
    const timeTakenMs = questionStartTime ? Date.now() - questionStartTime : 0;

    const record: AnswerRecord = {
      questionIndex: currentQuestionIndex,
      selectedOption: optionIndex,
      isCorrect,
      timeTakenMs,
    };

    set({ answers: [...answers, record] });
  },

  nextQuestion: () => {
    const { currentQuiz, currentQuestionIndex } = get();
    if (!currentQuiz) return;

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentQuiz.questions.length) {
      set({
        currentQuestionIndex: nextIndex,
        questionStartTime: Date.now(),
      });
    }
  },

  submitQuiz: async (quizId: string, profileId: string) => {
    const { answers } = get();
    set({ isSubmitting: true, error: null });

    try {
      const { quizService } = await import('../services/quizService');
      const answerIndices = answers.map((a) => a.selectedOption);
      const timings = answers.map((a) => a.timeTakenMs);

      const result = await quizService.submitQuiz(quizId, answerIndices, profileId, timings);
      set({ isSubmitting: false, result });
      return result;
    } catch (error: any) {
      const message = error?.message || 'Failed to submit quiz';
      set({ isSubmitting: false, error: message });
      return null;
    }
  },

  resetQuiz: () => {
    set(initialState);
  },

  showQuizOverlay: () => {
    set({ showOverlay: true });
  },

  hideQuizOverlay: () => {
    set({ showOverlay: false });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

export default useQuizStore;
