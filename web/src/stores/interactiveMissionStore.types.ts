export type MissionPlayState = 'idle' | 'loading' | 'playing' | 'decision' | 'listening' | 'evaluating' | 'result' | 'complete' | 'voice_listening';

export interface InteractiveMission {
  mission_id: string;
  title: string;
  title_he: string;
  description: string;
  difficulty: string;
  status: string;
  progress_percent: number;
  total_scenes: number;
  decision_count: number;
  scenes_completed: number;
  total_score: number;
  shekels_earned: number;
  composition_variant: string;
  interactive_manifest: InteractiveManifest | null;
  hls_base_path: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export interface InteractiveManifest {
  prerendered_scenes: PrerenderedScene[];
  on_demand_branches: Record<string, OnDemandBranch>;
  all_paths: ManifestPath[];
  total_scenes: number;
  composition_variant: string;
}

export interface PrerenderedScene {
  scene: number;
  hls_path: string;
  duration: number;
  preloaded: boolean;
}

export interface OnDemandBranch {
  prompt: string;
  prompt_transliteration?: string;
  prompt_translation?: string;
  decision_type: string;
  expected_responses: string[];
  timeout_seconds: number;
  max_attempts: number;
  hint_text?: string;
  hint_text_he?: string;
  options: Record<string, { scene: number; hls_path: string }>;
}

export interface ManifestPath {
  path_id: string;
  hls_manifest: string;
}

export interface SceneAttemptResult {
  success: boolean;
  quality: string;
  score: number;
  feedback: string;
  feedback_he: string;
  next_scene: number;
  hint: string;
  attempt_number: number;
  shekels_earned: number;
}

export interface GenerationProgress {
  mission_id: string;
  status: string;
  current_stage: string;
  progress_percent: number;
  error_message: string | null;
}

export interface InteractiveMissionStore {
  missions: InteractiveMission[];
  currentMission: InteractiveMission | null;
  playState: MissionPlayState;
  currentScene: number;
  lastAttemptResult: SceneAttemptResult | null;
  generatingMissionId: string | null;
  generationProgress: GenerationProgress | null;
  loading: boolean;
  error: string | null;

  fetchAvailableMissions: (profileId: string) => Promise<void>;
  generateMission: (data: { profile_id: string; avatar_id: string; show_content_id: string }) => Promise<void>;
  loadMission: (missionId: string) => Promise<void>;
  pollProgress: (missionId: string) => Promise<GenerationProgress | null>;
  submitAttempt: (data: { missionId: string; sceneNumber: number; profileId: string; transcript: string; language: string }) => Promise<SceneAttemptResult | null>;
  completeMission: (missionId: string) => Promise<void>;
  setPlayState: (state: MissionPlayState) => void;
  setCurrentScene: (scene: number) => void;
  clearError: () => void;
  reset: () => void;
}
