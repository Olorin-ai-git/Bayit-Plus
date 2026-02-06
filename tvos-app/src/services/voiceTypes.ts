/**
 * Voice Manager Types (tvOS)
 * Shared type definitions for voice command pipeline
 */

/** Voice command pipeline stages */
export type VoiceStage =
  | 'idle'
  | 'wake-word'
  | 'detected'
  | 'listening'
  | 'processing'
  | 'responding'
  | 'error'
  | 'timeout';

/** Voice session metrics for latency measurement */
export interface VoiceSessionMetrics {
  triggerTime: number;
  listeningTime: number;
  processingTime: number;
  ttsTime: number;
  totalTime: number;
  transcription: string;
  confidence: number;
  response: string;
  triggerType: 'menu-button' | 'wake-word';
}

/** Voice event listener callback */
export type VoiceEventListener = (data: {
  stage: VoiceStage;
  metrics?: VoiceSessionMetrics;
  error?: string;
}) => void;

/** Voice Manager Configuration (tvOS) */
export interface VoiceManagerConfig {
  listenTimeoutMs?: number;
  wakeWordTimeoutMs?: number;
  wakeWordLanguage?: string;
  speechLanguage?: string;
  ttsLanguage?: string;
  ttsRate?: number;
  enableMetrics?: boolean;
  enableBackgroundListening?: boolean;
  triggerType?: 'menu-button' | 'wake-word' | 'both';
}

/** Create initial empty session metrics */
export function createSessionMetrics(triggerType: 'menu-button' | 'wake-word'): VoiceSessionMetrics {
  return {
    triggerTime: 0,
    listeningTime: 0,
    processingTime: 0,
    ttsTime: 0,
    totalTime: 0,
    transcription: '',
    confidence: 0,
    response: '',
    triggerType,
  };
}
