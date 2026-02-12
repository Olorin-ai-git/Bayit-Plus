/**
 * Emotional Intelligence Types
 * Shared across all platforms for voice emotion analysis
 */

export interface VoiceAnalysis {
  frustrationLevel: number;      // 0.0 - 1.0
  mood: 'satisfied' | 'neutral' | 'frustrated' | 'confused';
  confidence: number;             // 0.0 - 1.0
  suggestion?: string;
  patterns: VoicePatterns;
}

export interface VoicePatterns {
  repeatedKeywords: string[];
  failureCount: number;
  successCount: number;
  successRate: number;
  avgResponseTime: number;
  escalatingLanguage: boolean;
}

export interface ToneAdjustment {
  responseSpeed: 'slow' | 'normal' | 'fast';
  ttsRate: number;                // 0.5 - 2.0
  verbosity: 'concise' | 'normal' | 'detailed';
}

export interface EmotionalContext {
  currentTranscript: string;
  commandHistory: string[];
  successHistory?: boolean[];
  previousAnalysis?: VoiceAnalysis;
}
