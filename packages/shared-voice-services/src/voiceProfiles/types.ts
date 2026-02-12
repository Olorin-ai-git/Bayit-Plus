/**
 * Voice Profiles Types
 * Multi-language voice profile system
 */

import type { LanguageCode } from '@olorin/shared-i18n';

export type VoiceGender = 'male' | 'female' | 'neutral';

export type VoiceAge = 'child' | 'young' | 'adult' | 'senior';

export interface VoiceCharacteristics {
  pitch: number; // 0.5 - 2.0, 1.0 is normal
  speed: number; // 0.5 - 2.0, 1.0 is normal
  volume: number; // 0.0 - 1.0
  emphasis: number; // 0.0 - 1.0, how much emphasis on important words
  pauseDuration: number; // milliseconds, pause between sentences
  breathiness: number; // 0.0 - 1.0, natural breathing sounds
  warmth: number; // 0.0 - 1.0, emotional warmth in voice
}

export interface LanguageVoiceProfile {
  language: LanguageCode;
  voiceId: string; // TTS provider voice ID
  gender: VoiceGender;
  age: VoiceAge;
  characteristics: VoiceCharacteristics;
  culturalNuances: {
    formalityLevel: number; // 0.0 - 1.0, 0 = casual, 1 = formal
    emotionalExpressiveness: number; // 0.0 - 1.0
    directness: number; // 0.0 - 1.0, 0 = indirect, 1 = direct
  };
  specialFeatures?: {
    dialectSupport?: string[]; // e.g., ['american', 'british', 'australian']
    accentStrength?: number; // 0.0 - 1.0
    regionalVariant?: string;
  };
}

export interface UserVoiceProfile {
  userId: string;
  displayName: string;
  primaryLanguage: LanguageCode;
  languageProfiles: Map<LanguageCode, LanguageVoiceProfile>;
  preferences: {
    autoLanguageDetection: boolean;
    fallbackLanguage: LanguageCode;
    adaptToContext: boolean; // Adapt voice based on content type
    preserveEmotionalTone: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

export interface VoiceProfileConfig {
  enableMultiLanguage: boolean;
  supportedLanguages: LanguageCode[];
  defaultCharacteristics: VoiceCharacteristics;
  ttsProvider: 'elevenlabs' | 'google' | 'azure' | 'aws';
  maxProfilesPerUser: number;
}

export interface VoiceProfileEvent {
  type: 'profile-created' | 'profile-updated' | 'language-switched' | 'characteristics-adjusted';
  userId: string;
  language?: LanguageCode;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
