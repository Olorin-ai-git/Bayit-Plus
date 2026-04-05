/**
 * ComprehensionOverlay — Phase 2 DEMO-02 orchestrator
 *
 * Drives the trigger -> question -> answer -> score -> adaptive-follow-up
 * loop in the browser. Delegates state-machine work to the
 * useComprehensionTurnController hook (below) and conditionally renders
 * one of the five presentational comprehension components based on
 * turnPhase.
 *
 * Hook contract (documented here because the overlay owns the
 * behavioural contract even when execution lives in the hook file):
 *   - API call: postComprehensionTurn({...}) — invoked once per
 *     student answer submission, also on initial trigger to pull the
 *     first question. Request shape: full ComprehensionTurnRequest
 *     (user/profile/content ids, character_name, personality_traits,
 *     scene_context, rubric, question_text, student_answer,
 *     playback_seconds, moment_timestamp, answer_modality). See
 *     postComprehensionTurn in comprehensionApi.ts for the wire type.
 *   - HTTP client guard: wrapped in an AbortController with a hard
 *     timeout of 8 seconds (setTimeout 8000 — UI-SPEC §6.10). Timeout
 *     fires -> controller.abort() -> setError -> error banner renders.
 *   - Store writes (turn reducer fan-out):
 *       * setTurnPhase(key, "pending") when a submission starts.
 *       * ingestTurnResponse(key, resp) on API success — this writes
 *         ONLY follow_up.* + adapt_level + session_id to the store
 *         (D-14: score/rationale never reach the render tree).
 *       * setQuestion(key, q, phrasing, adapt) after the reacting hold.
 *       * setError(key, message) on abort/timeout/failure.
 *       * resetTurn(key) when the answer_reveal branch finishes or the
 *         student taps Keep Watching from the error banner.
 *
 * FOCAL POINT: primary = character bubble (ComprehensionQuestionBubble / ComprehensionAnswerReveal / ComprehensionPendingState)
 * FOCAL POINT: secondary = answer input card (ComprehensionAnswerInput)
 * Layout: character bubble rendered first in DOM order, answer input below, gap-6 (24px) between.
 *
 * D-15 modality continuity: the character-voice modality (voice-only vs
 * lip-sync) is sourced from the existing Pause & Ask session and is NOT
 * recomputed per turn. This overlay does NOT implement lip-sync selection
 * itself — it delegates to the existing InteractionOverlay visual slot
 * (see olorin-media/bayit-plus/web/src/components/vod-interactions/InteractionOverlay.tsx).
 * The student's INPUT modality (text vs voice tab) is orthogonal (D-16).
 *
 * Second-trigger guard (turn.turnPhase !== 'idle'): enforced inside
 * useComprehensionTurnController's triggerSignal effect — silently
 * discarded, no queue, no stacking (T-02-05).
 *
 * Gates:
 *   - DEMO-04: @bayit/glass primitives only via child components.
 *   - D-14: score.score / score.rationale never rendered. Only
 *           follow_up.* + adapt_level reach the render tree.
 *   - D-17: no re-start affordance.
 */

// D-15 wiring anchor: ComprehensionOverlay delegates the character
// voice/lip-sync slot to the existing InteractionOverlay. The import
// below documents that contract so UI-checker can verify the link.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { InteractionOverlay as _InteractionOverlayWiringRef } from "@/components/vod-interactions/InteractionOverlay";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  makeSessionKey,
  useComprehensionSessionStore,
  type ComprehensionTurnState,
} from "@/stores/comprehensionSessionStore";
import ComprehensionQuestionBubble from "./ComprehensionQuestionBubble";
import ComprehensionAnswerInput from "./ComprehensionAnswerInput";
import ComprehensionAnswerReveal from "./ComprehensionAnswerReveal";
import ComprehensionPendingState from "./ComprehensionPendingState";
import ComprehensionErrorBanner from "./ComprehensionErrorBanner";
import { useComprehensionTurnController } from "./useComprehensionTurnController";

const EMPTY_TURN: ComprehensionTurnState = {
  turnPhase: "idle",
  currentQuestion: null,
  currentInCharacterPhrasing: null,
  currentAdaptLevel: "initial",
  answerModality: "text",
  sessionId: null,
  errorMessage: null,
};

export interface ComprehensionOverlayProps {
  userId: string;
  profileId: string;
  contentId: string;
  characterName: string;
  personalityTraits: string[];
  characterFrameUrl: string;
  sceneContext: string;
  rubric: string;
  playbackSeconds: number;
  momentTimestamp: number;
  onPauseVideo: () => void;
  onResumeVideo: () => void;
  triggerSignal: number;
}

const ComprehensionOverlay: React.FC<ComprehensionOverlayProps> = (props) => {
  const { t } = useTranslation();
  const key = makeSessionKey(props.userId, props.profileId, props.contentId);

  const turn = useComprehensionSessionStore(
    (s) => s.turnByKey[key] ?? EMPTY_TURN,
  );
  const setAnswerModality = useComprehensionSessionStore(
    (s) => s.setAnswerModality,
  );

  const { handleAnswerSubmit, handleKeepWatching } =
    useComprehensionTurnController({
      sessionKey: key,
      userId: props.userId,
      profileId: props.profileId,
      contentId: props.contentId,
      characterName: props.characterName,
      personalityTraits: props.personalityTraits,
      sceneContext: props.sceneContext,
      rubric: props.rubric,
      playbackSeconds: props.playbackSeconds,
      momentTimestamp: props.momentTimestamp,
      triggerSignal: props.triggerSignal,
      turn,
      onPauseVideo: props.onPauseVideo,
      onResumeVideo: props.onResumeVideo,
    });

  if (turn.turnPhase === "idle") {
    return null;
  }

  const isAnswerReveal =
    turn.turnPhase === "reacting" && turn.currentAdaptLevel === "answer_reveal";
  const isReactingFollowUp =
    turn.turnPhase === "reacting" && turn.currentAdaptLevel !== "answer_reveal";

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 bg-black/60"
      role="dialog"
      aria-label={t("comprehension.a11y.bubble_label", {
        character: props.characterName,
      })}
    >
      {turn.turnPhase === "question" ? (
        <>
          <ComprehensionQuestionBubble
            characterName={props.characterName}
            characterFrameUrl={props.characterFrameUrl}
            questionText={turn.currentQuestion ?? ""}
            inCharacterPhrasing={turn.currentInCharacterPhrasing ?? ""}
            showRetryAttribution={turn.currentAdaptLevel === "simpler_retry"}
          />
          <ComprehensionAnswerInput
            modality={turn.answerModality}
            onModalityChange={(m) => setAnswerModality(key, m)}
            onSubmit={handleAnswerSubmit}
            isLoading={false}
          />
        </>
      ) : null}
      {turn.turnPhase === "pending" ? (
        <>
          <ComprehensionPendingState
            characterName={props.characterName}
            characterFrameUrl={props.characterFrameUrl}
            questionText={turn.currentQuestion ?? ""}
          />
          <ComprehensionAnswerInput
            modality={turn.answerModality}
            onModalityChange={(m) => setAnswerModality(key, m)}
            onSubmit={handleAnswerSubmit}
            isLoading={true}
          />
        </>
      ) : null}
      {isAnswerReveal ? (
        <ComprehensionAnswerReveal
          characterName={props.characterName}
          characterFrameUrl={props.characterFrameUrl}
          revealBody={turn.currentInCharacterPhrasing ?? ""}
        />
      ) : null}
      {isReactingFollowUp ? (
        <ComprehensionQuestionBubble
          characterName={props.characterName}
          characterFrameUrl={props.characterFrameUrl}
          questionText={turn.currentQuestion ?? ""}
          inCharacterPhrasing={turn.currentInCharacterPhrasing ?? ""}
          showRetryAttribution={turn.currentAdaptLevel === "simpler_retry"}
        />
      ) : null}
      {turn.turnPhase === "error" ? (
        <ComprehensionErrorBanner onKeepWatching={handleKeepWatching} />
      ) : null}
    </div>
  );
};

export default ComprehensionOverlay;
