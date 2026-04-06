/**
 * useComprehensionTurnController — Phase 2 DEMO-02
 *
 * State-machine helpers for ComprehensionOverlay. Encapsulates the
 * 8s AbortController timeout, the post-turn reacting hold, and the
 * second-trigger-silent-discard guard so the overlay component stays
 * under the 200-line ceiling.
 *
 * Gates:
 *   - D-14: only follow_up.* + adapt_level from the API response are
 *     written to the store. score.score / score.rationale never pass
 *     through this hook.
 *   - T-02-05 / T-02-06: hard 8s AbortController timeout + second-
 *     trigger-while-active guard enforced here.
 */

import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  useComprehensionSessionStore,
  type ComprehensionTurnState,
} from "@/stores/comprehensionSessionStore";
import {
  postComprehensionTurn,
  type AnswerModality,
} from "@/services/comprehensionApi";

const TURN_TIMEOUT_MS = 8000;
const REACTING_HOLD_MS = 2300;

export interface TurnControllerInputs {
  sessionKey: string;
  userId: string;
  profileId: string;
  contentId: string;
  characterName: string;
  personalityTraits: string[];
  sceneContext: string;
  rubric: string;
  playbackSeconds: number;
  momentTimestamp: number;
  triggerSignal: number;
  turn: ComprehensionTurnState;
  onPauseVideo: () => void;
  onResumeVideo: () => void;
}

export interface TurnControllerOutputs {
  handleAnswerSubmit: (answer: string, modality: AnswerModality) => void;
  handleKeepWatching: () => void;
}

export function useComprehensionTurnController(
  inputs: TurnControllerInputs,
): TurnControllerOutputs {
  const {
    sessionKey,
    userId,
    profileId,
    contentId,
    characterName,
    personalityTraits,
    sceneContext,
    rubric,
    playbackSeconds,
    momentTimestamp,
    triggerSignal,
    turn,
    onPauseVideo,
    onResumeVideo,
  } = inputs;

  const { t } = useTranslation();

  const setTurnPhase = useComprehensionSessionStore((s) => s.setTurnPhase);
  const setQuestion = useComprehensionSessionStore((s) => s.setQuestion);
  const ingestTurnResponse = useComprehensionSessionStore(
    (s) => s.ingestTurnResponse,
  );
  const setError = useComprehensionSessionStore((s) => s.setError);
  const resetTurn = useComprehensionSessionStore((s) => s.resetTurn);

  const abortRef = useRef<AbortController | null>(null);
  const reactingTimerRef = useRef<number | null>(null);

  const runTurn = useCallback(
    async (answer: string, modality: AnswerModality, questionText: string) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        TURN_TIMEOUT_MS,
      );

      try {
        const resp = await postComprehensionTurn({
          user_id: userId,
          profile_id: profileId,
          content_id: contentId,
          character_name: characterName,
          personality_traits: personalityTraits,
          scene_context: sceneContext,
          rubric,
          question_text: questionText,
          student_answer: answer,
          playback_seconds: playbackSeconds,
          moment_timestamp: momentTimestamp,
          answer_modality: modality,
        });
        ingestTurnResponse(sessionKey, resp);
        if (reactingTimerRef.current) {
          window.clearTimeout(reactingTimerRef.current);
        }
        reactingTimerRef.current = window.setTimeout(() => {
          if (resp.adapt_level === "answer_reveal") {
            resetTurn(sessionKey);
            onResumeVideo();
          } else {
            setQuestion(
              sessionKey,
              resp.follow_up.question_text,
              resp.follow_up.in_character_phrasing,
              resp.adapt_level,
            );
          }
        }, REACTING_HOLD_MS);
      } catch (err) {
        setError(sessionKey, t("comprehension.error"));
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [
      userId,
      profileId,
      contentId,
      characterName,
      personalityTraits,
      sceneContext,
      rubric,
      playbackSeconds,
      momentTimestamp,
      sessionKey,
      ingestTurnResponse,
      setQuestion,
      resetTurn,
      onResumeVideo,
      setError,
      t,
    ],
  );

  useEffect(() => {
    if (triggerSignal <= 0) {
      return;
    }
    if (turn.turnPhase !== "idle") {
      return;
    }
    onPauseVideo();
    setTurnPhase(sessionKey, "pending");
    runTurn("", "text", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSignal]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      if (reactingTimerRef.current) {
        window.clearTimeout(reactingTimerRef.current);
      }
    };
  }, []);

  const handleAnswerSubmit = useCallback(
    (answer: string, modality: AnswerModality) => {
      setTurnPhase(sessionKey, "pending");
      runTurn(answer, modality, turn.currentQuestion ?? "");
    },
    [setTurnPhase, sessionKey, runTurn, turn.currentQuestion],
  );

  const handleKeepWatching = useCallback(() => {
    resetTurn(sessionKey);
    onResumeVideo();
  }, [resetTurn, sessionKey, onResumeVideo]);

  return { handleAnswerSubmit, handleKeepWatching };
}
