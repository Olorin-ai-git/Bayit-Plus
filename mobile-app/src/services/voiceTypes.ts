/**
 * Voice Manager Types (Mobile)
 * Shared type definitions for the mobile voice command pipeline
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
  wakeWordTime: number;
  listeningTime: number;
  processingTime: number;
  ttsTime: number;
  totalTime: number;
  transcription: string;
  confidence: number;
  response: string;
}

/** Voice event listener callback */
export type VoiceEventListener = (data: {
  stage: VoiceStage;
  metrics?: VoiceSessionMetrics;
  error?: string;
}) => void;

/** Voice Manager Configuration */
export interface VoiceManagerConfig {
  listenTimeoutMs?: number;
  wakeWordTimeoutMs?: number;
  wakeWordLanguage?: string;
  speechLanguage?: string;
  ttsLanguage?: string;
  ttsRate?: number;
  enableMetrics?: boolean;
  enableBackgroundListening?: boolean;
}

/** Create initial empty session metrics */
export function createSessionMetrics(): VoiceSessionMetrics {
  return {
    wakeWordTime: 0,
    listeningTime: 0,
    processingTime: 0,
    ttsTime: 0,
    totalTime: 0,
    transcription: '',
    confidence: 0,
    response: '',
  };
}
