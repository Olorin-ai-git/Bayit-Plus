/**
 * Comprehension Quiz Types
 *
 * TypeScript definitions for scene-triggered comprehension questions.
 */

export interface SubtitleCue {
  index: number;
  start_time: number;
  end_time: number;
  text: string;
  text_nikud?: string;
}

export interface SceneMarker {
  start_time: number;
  end_time: number;
  subtitle_text: string;
  cue_count: number;
}

export interface ComprehensionQuestion {
  question_id: string;
  question_text: string;
  question_text_en?: string;
  options: string[];
  options_en?: string[];
  scene_start_time: number;
  scene_end_time: number;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface ComprehensionSubmitRequest {
  selected_option: number;
  time_taken_ms: number;
}

export interface ComprehensionSubmitResponse {
  is_correct: boolean;
  explanation?: string;
  explanation_en?: string;
  points_earned: number;
  credits_deducted: number;
}

export interface SceneDetectionConfig {
  enabled: boolean;
  gapThresholdSeconds: number;
  minSceneDurationSeconds: number;
  checkIntervalMs: number;
}

export type ComprehensionFrequency = 'off' | 'low' | 'normal' | 'high';

export interface ComprehensionPreferences {
  enabled: boolean;
  frequency: ComprehensionFrequency;
  language: 'he' | 'en';
}
