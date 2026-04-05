/**
 * Comprehension API client — Phase 2 DEMO-01..04
 *
 * Thin wrapper over the centralized web/src/services/api instance. The api
 * instance's baseURL is already `/api/v1` (see api.js line 17), and its
 * response interceptor unwraps `response.data` (api.js line 168). Callers
 * receive the decoded body directly.
 *
 * Backend route (from 01-02-SUMMARY.md): POST /api/v1/comprehension/dev/turn.
 * With the baseURL prefix applied by axios, we pass `/comprehension/dev/turn`
 * here — matches the convention used by every other store in web/src/stores/.
 */

import api from "@/services/api";

export type AdaptLevel =
  | "initial"
  | "harder"
  | "simpler_retry"
  | "answer_reveal";
export type AnswerModality = "text" | "voice";
export type ScoreBand = "low" | "med" | "high";

export interface ComprehensionTurnRequest {
  user_id: string;
  profile_id: string;
  content_id: string;
  character_name: string;
  personality_traits: string[];
  scene_context: string;
  rubric: string;
  question_text: string;
  student_answer: string;
  playback_seconds: number;
  moment_timestamp: number;
  answer_modality: AnswerModality;
}

export interface ComprehensionFollowUp {
  question_text: string;
  in_character_phrasing: string;
  adapt_level: AdaptLevel;
}

export interface ComprehensionTurnResponse {
  // score is received over the wire for teacher-surface usage but D-14
  // forbids the student-facing store/UI from surfacing score.score or
  // score.rationale. See comprehensionSessionStore for the D-14 gate.
  score: { score: number; rationale: string; band: ScoreBand };
  follow_up: ComprehensionFollowUp;
  adapt_level: AdaptLevel;
  memory_retry_pending: boolean;
  session_id: string;
}

export async function postComprehensionTurn(
  body: ComprehensionTurnRequest,
): Promise<ComprehensionTurnResponse> {
  return (await api.post(
    "/comprehension/dev/turn",
    body,
  )) as ComprehensionTurnResponse;
}
