/**
 * useAICompanion Hook
 *
 * Fetches and manages AI companion data for educational content.
 * Provides episode context and quiz questions via real backend endpoints.
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import logger from "@/utils/logger";
import { companionService } from "@/services/api";
import type {
  AICompanionData,
  VocabularyWord,
  EpisodeContext,
  QuizQuestion,
} from "./types";

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

interface CompanionContextResponse {
  context: string;
  topics: string[];
  related_links: string[];
}

interface CompanionQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

interface CompanionQuizResponse {
  questions: CompanionQuizQuestion[];
}

const EMPTY_DATA: AICompanionData = {
  vocabulary: [],
  context: null,
  quiz: [],
};

function mapContextResponse(
  response: CompanionContextResponse,
  programTitle: string | undefined,
): EpisodeContext {
  const topicsCount = response.topics.length;
  const midpoint = Math.ceil(topicsCount / 2);
  return {
    title: programTitle ?? "",
    summary: response.context,
    concepts: response.topics.slice(0, midpoint),
    relatedTopics: response.topics.slice(midpoint),
  };
}

function mapQuizResponse(response: CompanionQuizResponse): QuizQuestion[] {
  return response.questions.map((q) => {
    const options = q.options.map((text, index) => ({
      id: String(index),
      text,
    }));
    return {
      id: q.id,
      question: q.question,
      options,
      correctOptionId: String(q.correct_index),
      explanation: q.explanation,
    };
  });
}

export function useAICompanion({
  contentId,
  programTitle,
  educationalTags: _educationalTags,
  enabled = true,
}: UseAICompanionProps): UseAICompanionResult {
  const { t } = useTranslation();
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

    const language = i18n.language || "he";

    try {
      const [contextResponse, quizResponse] = await Promise.all([
        companionService.getContext(
          contentId,
          language,
        ) as Promise<CompanionContextResponse>,
        companionService.getQuiz(
          contentId,
          language,
        ) as Promise<CompanionQuizResponse>,
      ]);

      const context = mapContextResponse(contextResponse, programTitle);
      const quiz = mapQuizResponse(quizResponse);

      setData({ vocabulary: [], context, quiz });
      logger.debug("AI Companion data loaded", "useAICompanion", { contentId });
    } catch (err: any) {
      logger.error("Failed to load AI Companion data", "useAICompanion", err);
      setError(t("player.companion.loadError"));
      setData(EMPTY_DATA);
    } finally {
      setIsLoading(false);
    }
  }, [contentId, programTitle, enabled, t]);

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
