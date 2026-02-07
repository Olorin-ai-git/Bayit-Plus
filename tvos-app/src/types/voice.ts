/**
 * Voice Types for tvOS
 * Type definitions for TV-specific voice commands and Siri integration
 */

// Voice session metrics for analytics and debugging
export interface VoiceSessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  wordsDetected: number;
  confidenceAvg: number;
  silenceDurationMs: number;
  interruptions: number;
  commandType?: string;
  successfulExecution: boolean;
}

// Voice command response types
export interface VoiceResponse {
  type: 'success' | 'error' | 'clarification' | 'feedback';
  message: string;
  timestamp: number;
  ttsDurationMs?: number;
}

// Voice error types
export type VoiceErrorType =
  | 'microphone_permission'
  | 'microphone_unavailable'
  | 'network_error'
  | 'recognition_failed'
  | 'command_not_understood'
  | 'execution_failed'
  | 'timeout'
  | 'unknown';

export interface VoiceError {
  type: VoiceErrorType;
  message: string;
  timestamp: number;
  recoverable: boolean;
}

export interface CommandHistoryEntry {
  command: string;
  timestamp: number;
  success: boolean;
}

// Voice store state interface - extracted from voiceStore.ts for file size compliance
export interface VoiceStoreState {
  // Voice session state
  isListening: boolean;
  isProcessing: boolean;
  currentTranscription: string;
  lastCommand: string | null;
  lastResponse: VoiceResponse | null;
  error: VoiceError | null;
  sessionMetrics: VoiceSessionMetrics | null;

  // Voice activation state (TV-specific)
  isWakeWordActive: boolean;
  isMenuButtonListening: boolean;

  // Audio ducking state (for TTS playback)
  isAudioDucked: boolean;

  // Command history (last 5 commands for context)
  commandHistory: CommandHistoryEntry[];

  // Actions - Session control
  startListening: (trigger: 'menu-button' | 'wake-word' | 'manual') => void;
  stopListening: () => void;
  setProcessing: (isProcessing: boolean) => void;

  // Actions - Transcription and command updates
  setTranscription: (text: string) => void;
  setCommand: (command: string) => void;
  setResponse: (response: VoiceResponse) => void;
  clearTranscription: () => void;

  // Actions - Error handling
  setError: (error: VoiceError) => void;
  clearError: () => void;

  // Actions - Session metrics
  setSessionMetrics: (metrics: VoiceSessionMetrics) => void;
  updateSessionMetrics: (updates: Partial<VoiceSessionMetrics>) => void;
  endSession: (success: boolean) => void;

  // Actions - Audio ducking (TV-specific)
  setAudioDucked: (ducked: boolean) => void;

  // Actions - Wake word state (TV-specific)
  setWakeWordActive: (active: boolean) => void;

  // Actions - Command history
  addCommandToHistory: (command: string, success: boolean) => void;
  clearCommandHistory: () => void;

  // Selectors
  getLastNCommands: (n: number) => CommandHistoryEntry[];
  isActiveSession: () => boolean;
  getSessionDuration: () => number | null;
}
