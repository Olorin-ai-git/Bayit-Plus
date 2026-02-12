/**
 * Analytics Types
 * Type definitions for voice analytics
 */

export interface VoiceSessionMetrics {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  successRate: number;
  averageConfidence: number;
  averageFrustration: number;
  mostUsedIntents: IntentUsage[];
  languagesUsed: string[];
}

export interface IntentUsage {
  intent: string;
  count: number;
  successRate: number;
}

export interface VoiceEvent {
  eventType: VoiceEventType;
  sessionId: string;
  userId?: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export type VoiceEventType =
  | 'session_start'
  | 'session_end'
  | 'command_received'
  | 'command_processed'
  | 'command_executed'
  | 'command_failed'
  | 'frustration_detected'
  | 'help_offered'
  | 'help_accepted'
  | 'help_declined'
  | 'error_occurred';

export interface AnalyticsConfig {
  enableTracking: boolean;
  enablePerformanceMetrics: boolean;
  sampleRate: number;
  batchSize: number;
}

export interface PerformanceMetrics {
  processingTime: number;
  intentDetectionTime: number;
  emotionalAnalysisTime: number;
}
