export interface SceneTrigger {
  trigger_id: string;
  timestamp_seconds: number;
  trigger_type: string;
  target_word_he: string;
  prompt_text_en: string;
  prompt_text_he: string;
  expected_response: string;
  avatar_animation: string;
  duration_seconds: number;
}

export interface TriggerResult {
  score: number;
  correct: boolean;
  animation_name: string;
}

export interface LipsyncWeights {
  timestamp: number;
  weights: Record<string, number>;
}

export interface LiveLayerStore {
  activeTrigger: SceneTrigger | null;
  triggerResult: TriggerResult | null;
  lipsyncWeights: LipsyncWeights | null;
  wsConnected: boolean;
  loading: boolean;
  error: string | null;

  fetchTriggers: (contentId: string) => Promise<SceneTrigger[]>;
  setActiveTrigger: (trigger: SceneTrigger | null) => void;
  setTriggerResult: (result: TriggerResult | null) => void;
  setLipsyncWeights: (weights: LipsyncWeights | null) => void;
  setWsConnected: (connected: boolean) => void;
  clearError: () => void;
}
