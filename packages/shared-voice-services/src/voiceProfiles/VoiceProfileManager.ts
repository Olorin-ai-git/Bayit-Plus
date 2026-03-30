/**
 * Voice Profile Manager
 * Manages multi-language voice profiles for users
 */

import type { LanguageCode } from '@olorin/shared-i18n';
import { languages } from '@olorin/shared-i18n';

const SUPPORTED_LANGUAGES: LanguageCode[] = languages.map((l: { code: LanguageCode }) => l.code);
import type {
  UserVoiceProfile,
  LanguageVoiceProfile,
  VoiceProfileConfig,
  VoiceCharacteristics,
  VoiceProfileEvent
} from './types';

interface StorageAdapter {
  save(userId: string, profile: UserVoiceProfile): Promise<void>;
  load(userId: string): Promise<UserVoiceProfile | null>;
  delete(userId: string): Promise<void>;
}

export class VoiceProfileManager {
  private config: Required<VoiceProfileConfig>;
  private profiles: Map<string, UserVoiceProfile> = new Map();
  private storageAdapter: StorageAdapter | null = null;
  private listeners: Set<(event: VoiceProfileEvent) => void> = new Set();

  constructor(config: Partial<VoiceProfileConfig> = {}) {
    this.config = {
      enableMultiLanguage: config.enableMultiLanguage ?? true,
      supportedLanguages: config.supportedLanguages || [...SUPPORTED_LANGUAGES],
      defaultCharacteristics: config.defaultCharacteristics || this.getDefaultCharacteristics(),
      ttsProvider: config.ttsProvider || 'elevenlabs',
      maxProfilesPerUser: config.maxProfilesPerUser || 10
    };
  }

  /**
   * Set storage adapter for persistence
   */
  setStorageAdapter(adapter: StorageAdapter): void {
    this.storageAdapter = adapter;
  }

  /**
   * Create or update user voice profile
   */
  async createProfile(
    userId: string,
    displayName: string,
    primaryLanguage: LanguageCode
  ): Promise<UserVoiceProfile> {
    if (!this.config.supportedLanguages.includes(primaryLanguage)) {
      throw new Error(`Language ${primaryLanguage} is not supported`);
    }

    const existingProfile = this.profiles.get(userId);
    const now = Date.now();

    const profile: UserVoiceProfile = {
      userId,
      displayName,
      primaryLanguage,
      languageProfiles: existingProfile?.languageProfiles || new Map(),
      preferences: existingProfile?.preferences || {
        autoLanguageDetection: true,
        fallbackLanguage: primaryLanguage,
        adaptToContext: true,
        preserveEmotionalTone: true
      },
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now
    };

    this.profiles.set(userId, profile);

    if (this.storageAdapter) {
      await this.storageAdapter.save(userId, profile);
    }

    this.notifyListeners({
      type: 'profile-created',
      userId,
      timestamp: now
    });

    return profile;
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<UserVoiceProfile | null> {
    let profile = this.profiles.get(userId);

    if (!profile && this.storageAdapter) {
      const loadedProfile = await this.storageAdapter.load(userId);
      if (loadedProfile) {
        this.profiles.set(userId, loadedProfile);
        profile = loadedProfile;
      }
    }

    return profile || null;
  }

  /**
   * Set language voice profile
   */
  async setLanguageProfile(
    userId: string,
    languageProfile: LanguageVoiceProfile
  ): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    if (!this.config.supportedLanguages.includes(languageProfile.language)) {
      throw new Error(`Language ${languageProfile.language} is not supported`);
    }

    profile.languageProfiles.set(languageProfile.language, languageProfile);
    profile.updatedAt = Date.now();

    if (this.storageAdapter) {
      await this.storageAdapter.save(userId, profile);
    }

    this.notifyListeners({
      type: 'profile-updated',
      userId,
      language: languageProfile.language,
      timestamp: Date.now()
    });
  }

  /**
   * Get language profile for user
   */
  async getLanguageProfile(
    userId: string,
    language: LanguageCode
  ): Promise<LanguageVoiceProfile | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    return profile.languageProfiles.get(language) || null;
  }

  /**
   * Get voice characteristics for language
   */
  async getCharacteristics(
    userId: string,
    language: LanguageCode
  ): Promise<VoiceCharacteristics> {
    const langProfile = await this.getLanguageProfile(userId, language);
    return langProfile?.characteristics || this.config.defaultCharacteristics;
  }

  /**
   * Update voice characteristics
   */
  async updateCharacteristics(
    userId: string,
    language: LanguageCode,
    characteristics: Partial<VoiceCharacteristics>
  ): Promise<void> {
    let langProfile = await this.getLanguageProfile(userId, language);

    if (!langProfile) {
      langProfile = this.createDefaultLanguageProfile(language);
    }

    langProfile.characteristics = {
      ...langProfile.characteristics,
      ...characteristics
    };

    await this.setLanguageProfile(userId, langProfile);

    this.notifyListeners({
      type: 'characteristics-adjusted',
      userId,
      language,
      timestamp: Date.now(),
      metadata: { characteristics }
    });
  }

  /**
   * Switch primary language
   */
  async switchPrimaryLanguage(userId: string, language: LanguageCode): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    if (!this.config.supportedLanguages.includes(language)) {
      throw new Error(`Language ${language} is not supported`);
    }

    profile.primaryLanguage = language;
    profile.updatedAt = Date.now();

    if (this.storageAdapter) {
      await this.storageAdapter.save(userId, profile);
    }

    this.notifyListeners({
      type: 'language-switched',
      userId,
      language,
      timestamp: Date.now()
    });
  }

  /**
   * Delete user profile
   */
  async deleteProfile(userId: string): Promise<void> {
    this.profiles.delete(userId);

    if (this.storageAdapter) {
      await this.storageAdapter.delete(userId);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: VoiceProfileEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceProfileConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): VoiceProfileConfig {
    return { ...this.config };
  }

  /**
   * Create default language profile
   */
  private createDefaultLanguageProfile(language: LanguageCode): LanguageVoiceProfile {
    return {
      language,
      voiceId: this.getDefaultVoiceId(language),
      gender: 'neutral',
      age: 'adult',
      characteristics: { ...this.config.defaultCharacteristics },
      culturalNuances: {
        formalityLevel: 0.5,
        emotionalExpressiveness: 0.7,
        directness: 0.6
      }
    };
  }

  /**
   * Get default voice ID for language
   */
  private getDefaultVoiceId(language: LanguageCode): string {
    const voiceMap: Record<LanguageCode, string> = {
      he: 'hebrew-voice-1',
      en: 'english-voice-1',
      es: 'spanish-voice-1',
      zh: 'chinese-voice-1',
      fr: 'french-voice-1',
      it: 'italian-voice-1',
      hi: 'hindi-voice-1',
      ta: 'tamil-voice-1',
      bn: 'bengali-voice-1',
      ja: 'japanese-voice-1'
    };
    return voiceMap[language];
  }

  /**
   * Get default characteristics
   */
  private getDefaultCharacteristics(): VoiceCharacteristics {
    return {
      pitch: 1.0,
      speed: 1.0,
      volume: 0.8,
      emphasis: 0.5,
      pauseDuration: 500,
      breathiness: 0.3,
      warmth: 0.7
    };
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(event: VoiceProfileEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        // Silently catch listener errors
      }
    }
  }
}

// Singleton instance
export const voiceProfileManager = new VoiceProfileManager();
