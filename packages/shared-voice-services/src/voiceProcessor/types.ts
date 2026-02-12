/**
 * Voice Processor Types
 * Type definitions for voice command processing
 */

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  language: string;
  timestamp: number;
  intent?: CommandIntent;
}

export interface CommandIntent {
  action: VoiceAction;
  entity?: string;
  query?: string;
  parameters?: Record<string, unknown>;
}

export type VoiceAction =
  | 'search'
  | 'play'
  | 'pause'
  | 'stop'
  | 'navigate'
  | 'volume'
  | 'settings'
  | 'help'
  | 'unknown';

export interface VoiceProcessorConfig {
  language: string;
  confidenceThreshold: number;
  enableIntentDetection: boolean;
  enableCommandHistory: boolean;
  maxHistoryLength: number;
}

export interface ProcessedCommand {
  command: VoiceCommand;
  intent: CommandIntent;
  shouldExecute: boolean;
  reason?: string;
}
