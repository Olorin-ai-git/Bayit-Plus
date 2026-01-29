/**
 * Voice Avatar Types
 * Type definitions for the unified Olorin voice system
 */

/**
 * Avatar visibility modes controlling how the Olorin wizard is displayed
 */
export type AvatarMode = 'full' | 'compact' | 'minimal' | 'icon_only';

/**
 * Voice interaction intents for routing commands
 */
export type VoiceIntent =
  | 'CHAT'          // Natural language conversation with Claude
  | 'SEARCH'        // Search for content
  | 'NAVIGATION'    // Navigate to specific pages/sections
  | 'PLAYBACK'      // Control playback (play, pause, stop)
  | 'SCROLL'        // Navigate lists and grids
  | 'CONTROL';      // System controls (volume, language, etc.)

/**
 * Trigger types for voice activation
 */
export type VoiceTrigger = 'manual' | 'wake-word';

/**
 * Voice command executed by user
 */
export interface VoiceCommand {
  id: string;
  transcript: string;
  intent: VoiceIntent;
  confidence: number;
  timestamp: string;
  executedAction?: string;
}

/**
 * Configuration for Olorin Voice Orchestrator
 */
export interface VoiceConfig {
  /** Platform: web, ios, android, tvos */
  platform: 'web' | 'ios' | 'android' | 'tvos';

  /** User's preferred language (ISO 639-1 code) */
  language: string;

  /** Enable/disable wake word detection */
  wakeWordEnabled: boolean;

  /** Enable/disable streaming mode (vs batch) */
  streamingMode: boolean;

  /** Initial avatar visibility mode */
  initialAvatarMode: AvatarMode;

  /** Auto-expand avatar on wake word detection */
  autoExpandOnWakeWord: boolean;

  /** Collapse delay in milliseconds (0 = no auto-collapse) */
  collapseDelay: number;
}

/**
 * Voice action payload for specific intent types
 */
export interface VoiceActionPayload {
  navigate?: {
    path: string;
  };
  search?: {
    query: string;
    category?: string;
  };
  playback?: {
    action: 'play' | 'pause' | 'stop' | 'resume' | 'play_trailer';
  };
  scroll?: {
    direction: 'up' | 'down';
  };
  control?: {
    control: string;
  };
  chat?: {
    message: string;
  };
}

/**
 * Voice orchestrator state
 */
export interface VoiceOrchestratorState {
  /** Current voice state */
  voiceState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

  /** Current avatar mode */
  avatarMode: AvatarMode;

  /** Current interaction type */
  currentInteractionType: VoiceIntent | null;

  /** Last intent confidence */
  lastIntentConfidence: number;

  /** Is wake word detection active */
  isWakeWordActive: boolean;

  /** Is streaming mode active */
  isStreamingMode: boolean;
}

export default VoiceIntent;
