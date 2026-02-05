/**
 * useComprehensionQuizIntegration Hook
 *
 * Integrates scene detection and comprehension quiz into VideoPlayer.
 * Handles scene end detection, question fetching, answer submission, and video pause/resume.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSceneDetection } from '@/hooks/useSceneDetection';
import { useComprehensionQuiz } from '@/hooks/useComprehensionQuiz';
import type { SubtitleCue } from '@/hooks/useSceneDetection';
import type { ComprehensionQuestion, SubmitResult } from '@/hooks/useComprehensionQuiz';
import { logger } from '@/utils/logger';

export interface ComprehensionQuizFeedback {
  isCorrect: boolean;
  explanation?: string;
  pointsEarned: number;
}

export interface UseComprehensionQuizIntegrationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  contentId: string;
  subtitles: SubtitleCue[];
  enabled: boolean;
  isLive?: boolean;
  language?: string;
}

export interface UseComprehensionQuizIntegrationReturn {
  question: ComprehensionQuestion | null;
  isLoading: boolean;
  error: string | null;
  feedback: ComprehensionQuizFeedback | null;
  handleAnswer: (optionIndex: number) => Promise<void>;
  handleSkip: () => void;
}

export const useComprehensionQuizIntegration = ({
  videoRef,
  contentId,
  subtitles,
  enabled,
  isLive = false,
  language = 'he',
}: UseComprehensionQuizIntegrationProps): UseComprehensionQuizIntegrationReturn => {
  const [feedback, setFeedback] = useState<ComprehensionQuizFeedback | null>(null);
  const answerStartTimeRef = useRef<number>(0);

  // Scene detection hook
  const {
    currentScene,
    sceneEndDetected,
    resetSceneDetection,
  } = useSceneDetection(
    videoRef,
    contentId,
    subtitles,
    {
      enabled: enabled && !isLive,
      gapThresholdSeconds: 5.0,
      minSceneDurationSeconds: 30.0,
      checkIntervalMs: 500,
    }
  );

  // Comprehension quiz hook
  const {
    question,
    isLoading,
    error,
    fetchQuestion,
    submitAnswer,
    clearQuestion,
  } = useComprehensionQuiz(contentId);

  // Fetch question when scene end is detected
  useEffect(() => {
    if (sceneEndDetected && currentScene && !question && !isLoading) {
      answerStartTimeRef.current = Date.now();
      fetchQuestion(
        currentScene.start_time,
        currentScene.end_time,
        language
      );
    }
  }, [sceneEndDetected, currentScene, question, isLoading, fetchQuestion, language]);

  const handleAnswer = useCallback(
    async (optionIndex: number) => {
      if (!question) return;

      const timeTaken = Date.now() - answerStartTimeRef.current;

      try {
        const result: SubmitResult = await submitAnswer(
          question.question_id,
          optionIndex,
          timeTaken
        );

        // Show feedback
        setFeedback({
          isCorrect: result.is_correct,
          explanation: result.explanation,
          pointsEarned: result.points_earned,
        });

        // Resume video after 2-second feedback delay
        setTimeout(() => {
          videoRef.current?.play();
          resetSceneDetection();
          clearQuestion();
          setFeedback(null);
        }, 2000);
      } catch (err) {
        logger.error('Failed to submit answer', 'useComprehensionQuizIntegration', err);
        // Resume video anyway on error
        videoRef.current?.play();
        resetSceneDetection();
        clearQuestion();
      }
    },
    [question, submitAnswer, videoRef, resetSceneDetection, clearQuestion]
  );

  const handleSkip = useCallback(() => {
    // Resume video immediately
    videoRef.current?.play();
    resetSceneDetection();
    clearQuestion();
    setFeedback(null);
  }, [videoRef, resetSceneDetection, clearQuestion]);

  return {
    question,
    isLoading,
    error,
    feedback,
    handleAnswer,
    handleSkip,
  };
};
