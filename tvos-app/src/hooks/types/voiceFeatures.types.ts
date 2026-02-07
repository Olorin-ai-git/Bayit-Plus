/**
 * Types for useVoiceFeatures Hook
 *
 * Voice feature detection, capabilities, language support,
 * and command suggestion types for tvOS.
 */

export interface VoiceHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  speechRecognitionAvailable: boolean;
  ttsAvailable: boolean;
  microphoneAvailable: boolean;
  supportedLanguages: string[];
}

export interface LanguageSupport {
  currentLanguage: string;
  supportedLanguages: string[];
  isLanguageSupported: (language: string) => boolean;
  setLanguage: (language: string) => Promise<void>;
}

export interface VoiceCapabilities {
  menuButtonTriggerAvailable: boolean;
  wakeWordAvailable: boolean;
  ttsAvailable: boolean;
  speechRecognitionAvailable: boolean;
  maxListeningDurationMs: number;
  suggestedTimeout: number;
  voiceFeaturesEnabled: boolean;
}

export interface CommandSuggestion {
  text: string;
  description: string;
  category: 'navigation' | 'playback' | 'search' | 'window';
}

export interface VoiceFeaturesOptions {
  enableHealthCheck?: boolean;
  enableLanguageSupport?: boolean;
  defaultLanguage?: string;
}
