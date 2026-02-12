export interface V2VTransformResult {
  input_transcript: string;
  corrected_transcript: string;
  v2v_audio_url: string;
  latency_ms: number;
  score_before: number;
  score_after: number;
  score_delta: number;
}

export interface V2VSessionSummary {
  id: string;
  avatar_id: string;
  total_transforms: number;
  average_latency_ms: number;
  score_improvement: number;
  credits_charged: number;
  status: string;
  created_at: string;
}

export interface V2VStore {
  lastResult: V2VTransformResult | null;
  sessions: V2VSessionSummary[];
  loading: boolean;
  error: string | null;
  wsConnected: boolean;

  transformVoice: (
    avatarId: string,
    profileId: string,
    audioBase64: string,
    targetPhraseHe: string,
  ) => Promise<void>;
  fetchSessions: (profileId: string) => Promise<void>;
  clearError: () => void;
}
