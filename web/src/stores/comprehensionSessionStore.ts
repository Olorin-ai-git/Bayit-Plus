/**
 * Comprehension Session Store — Phase 2 DEMO-01..04
 *
 * Zustand store holding client-side comprehension UX state keyed by the
 * natural (user_id, profile_id, content_id) tuple that the backend uses for
 * its VODFilmMemory / ComprehensionSession documents.
 *
 * Intentional D-gates (enforced by phase grep checks):
 *   - D-14: the numeric grade and rationale fields from the backend turn
 *           response are NEVER copied into this store. ingestTurnResponse
 *           only pulls fields that the student is allowed to see (the
 *           follow_up question text, in-character phrasing, adapt_level,
 *           and session_id). Teacher-only data stays server-side.
 *   - D-17: no session-lifecycle unwind method exists. resetTurn clears
 *           the per-key TURN state but DOES NOT remove the session id —
 *           resume-only integrity per UI-SPEC 6.8. Toggling the feature
 *           off mid-session halts future triggers but preserves state.
 */

import { create } from "zustand";
import logger from "@bayit/shared-utils/logger";
import type {
  AdaptLevel,
  AnswerModality,
  ComprehensionTurnResponse,
} from "@/services/comprehensionApi";

const storeLogger = logger.scope("ComprehensionSessionStore");

type TurnPhase =
  | "idle"
  | "question"
  | "answering"
  | "pending"
  | "reacting"
  | "error";

export interface ComprehensionTurnState {
  turnPhase: TurnPhase;
  currentQuestion: string | null;
  currentInCharacterPhrasing: string | null;
  currentAdaptLevel: AdaptLevel;
  answerModality: AnswerModality;
  sessionId: string | null;
  errorMessage: string | null;
}

interface ComprehensionSessionState {
  toggleByKey: Record<string, boolean>;
  turnByKey: Record<string, ComprehensionTurnState>;
  setToggle: (key: string, on: boolean) => void;
  getToggle: (key: string) => boolean;
  setTurnPhase: (key: string, phase: TurnPhase) => void;
  setQuestion: (
    key: string,
    question: string,
    phrasing: string,
    adapt: AdaptLevel,
  ) => void;
  setAnswerModality: (key: string, modality: AnswerModality) => void;
  ingestTurnResponse: (key: string, resp: ComprehensionTurnResponse) => void;
  setError: (key: string, message: string) => void;
  resetTurn: (key: string) => void;
}

const EMPTY_TURN: ComprehensionTurnState = {
  turnPhase: "idle",
  currentQuestion: null,
  currentInCharacterPhrasing: null,
  currentAdaptLevel: "initial",
  answerModality: "text",
  sessionId: null,
  errorMessage: null,
};

export const useComprehensionSessionStore = create<ComprehensionSessionState>(
  (set, get) => ({
    toggleByKey: {},
    turnByKey: {},
    setToggle: (key, on) => {
      storeLogger.info("toggle", { key, on: String(on) });
      set((s) => ({ toggleByKey: { ...s.toggleByKey, [key]: on } }));
    },
    getToggle: (key) => !!get().toggleByKey[key],
    setTurnPhase: (key, phase) =>
      set((s) => ({
        turnByKey: {
          ...s.turnByKey,
          [key]: { ...(s.turnByKey[key] ?? EMPTY_TURN), turnPhase: phase },
        },
      })),
    setQuestion: (key, question, phrasing, adapt) =>
      set((s) => ({
        turnByKey: {
          ...s.turnByKey,
          [key]: {
            ...(s.turnByKey[key] ?? EMPTY_TURN),
            currentQuestion: question,
            currentInCharacterPhrasing: phrasing,
            currentAdaptLevel: adapt,
            turnPhase: "question",
            errorMessage: null,
          },
        },
      })),
    setAnswerModality: (key, modality) =>
      set((s) => ({
        turnByKey: {
          ...s.turnByKey,
          [key]: {
            ...(s.turnByKey[key] ?? EMPTY_TURN),
            answerModality: modality,
          },
        },
      })),
    ingestTurnResponse: (key, resp) =>
      set((s) => ({
        turnByKey: {
          ...s.turnByKey,
          [key]: {
            ...(s.turnByKey[key] ?? EMPTY_TURN),
            sessionId: resp.session_id,
            currentQuestion: resp.follow_up.question_text,
            currentInCharacterPhrasing: resp.follow_up.in_character_phrasing,
            currentAdaptLevel: resp.adapt_level,
            turnPhase: "reacting",
            errorMessage: null,
          },
        },
      })),
    setError: (key, message) =>
      set((s) => ({
        turnByKey: {
          ...s.turnByKey,
          [key]: {
            ...(s.turnByKey[key] ?? EMPTY_TURN),
            turnPhase: "error",
            errorMessage: message,
          },
        },
      })),
    resetTurn: (key) =>
      set((s) => ({ turnByKey: { ...s.turnByKey, [key]: EMPTY_TURN } })),
  }),
);

export const makeSessionKey = (
  userId: string,
  profileId: string,
  contentId: string,
) => `${userId}:${profileId}:${contentId}`;
