/**
 * Avatar Preferences Manager
 * Manages user avatar preferences with persistence
 */

import type {
  AvatarPreferences,
  AvatarPreferencesUpdate,
  PreferencesStorageAdapter
} from './types';

export class AvatarPreferencesManager {
  private preferences: AvatarPreferences;
  private storageAdapter?: PreferencesStorageAdapter;
  private listeners: Set<(preferences: AvatarPreferences) => void> = new Set();

  constructor(
    initialPreferences?: Partial<AvatarPreferences>,
    storageAdapter?: PreferencesStorageAdapter
  ) {
    this.preferences = {
      enabled: initialPreferences?.enabled ?? false,
      avatarId: initialPreferences?.avatarId,
      style: initialPreferences?.style ?? 'realistic',
      quality: initialPreferences?.quality ?? 'high',
      showOnStartup: initialPreferences?.showOnStartup ?? false,
      autoHideAfterResponse: initialPreferences?.autoHideAfterResponse ?? false,
      autoHideDelay: initialPreferences?.autoHideDelay ?? 5000,
      position: initialPreferences?.position ?? 'bottom-right',
      size: initialPreferences?.size ?? 'medium',
      voiceEnabled: initialPreferences?.voiceEnabled ?? true,
      animationsEnabled: initialPreferences?.animationsEnabled ?? true,
      emotionsEnabled: initialPreferences?.emotionsEnabled ?? true
    };

    this.storageAdapter = storageAdapter;
  }

  /**
   * Initialize preferences from storage
   */
  async initialize(): Promise<void> {
    if (!this.storageAdapter) return;

    const stored = await this.storageAdapter.load();
    if (stored) {
      this.preferences = stored;
      this.notifyListeners();
    }
  }

  /**
   * Get preferences
   */
  getPreferences(): AvatarPreferences {
    return { ...this.preferences };
  }

  /**
   * Update preferences
   */
  async updatePreferences(
    update: AvatarPreferencesUpdate
  ): Promise<void> {
    this.preferences = {
      ...this.preferences,
      ...update
    };

    if (this.storageAdapter) {
      await this.storageAdapter.save(this.preferences);
    }

    this.notifyListeners();
  }

  /**
   * Enable avatar
   */
  async enable(): Promise<void> {
    await this.updatePreferences({ enabled: true });
  }

  /**
   * Disable avatar
   */
  async disable(): Promise<void> {
    await this.updatePreferences({ enabled: false });
  }

  /**
   * Set avatar ID
   */
  async setAvatarId(avatarId: string): Promise<void> {
    await this.updatePreferences({ avatarId });
  }

  /**
   * Set position
   */
  async setPosition(position: AvatarPreferences['position']): Promise<void> {
    await this.updatePreferences({ position });
  }

  /**
   * Set size
   */
  async setSize(size: AvatarPreferences['size']): Promise<void> {
    await this.updatePreferences({ size });
  }

  /**
   * Set style
   */
  async setStyle(style: AvatarPreferences['style']): Promise<void> {
    await this.updatePreferences({ style });
  }

  /**
   * Set quality
   */
  async setQuality(quality: AvatarPreferences['quality']): Promise<void> {
    await this.updatePreferences({ quality });
  }

  /**
   * Enable voice
   */
  async enableVoice(): Promise<void> {
    await this.updatePreferences({ voiceEnabled: true });
  }

  /**
   * Disable voice
   */
  async disableVoice(): Promise<void> {
    await this.updatePreferences({ voiceEnabled: false });
  }

  /**
   * Enable animations
   */
  async enableAnimations(): Promise<void> {
    await this.updatePreferences({ animationsEnabled: true });
  }

  /**
   * Disable animations
   */
  async disableAnimations(): Promise<void> {
    await this.updatePreferences({ animationsEnabled: false });
  }

  /**
   * Enable emotions
   */
  async enableEmotions(): Promise<void> {
    await this.updatePreferences({ emotionsEnabled: true });
  }

  /**
   * Disable emotions
   */
  async disableEmotions(): Promise<void> {
    await this.updatePreferences({ emotionsEnabled: false });
  }

  /**
   * Reset to defaults
   */
  async reset(): Promise<void> {
    this.preferences = {
      enabled: false,
      style: 'realistic',
      quality: 'high',
      showOnStartup: false,
      autoHideAfterResponse: false,
      autoHideDelay: 5000,
      position: 'bottom-right',
      size: 'medium',
      voiceEnabled: true,
      animationsEnabled: true,
      emotionsEnabled: true
    };

    if (this.storageAdapter) {
      await this.storageAdapter.save(this.preferences);
    }

    this.notifyListeners();
  }

  /**
   * Clear preferences
   */
  async clear(): Promise<void> {
    if (this.storageAdapter) {
      await this.storageAdapter.clear();
    }
    await this.reset();
  }

  /**
   * Add preferences listener
   */
  addListener(
    listener: (preferences: AvatarPreferences) => void
  ): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove preferences listener
   */
  removeListener(
    listener: (preferences: AvatarPreferences) => void
  ): void {
    this.listeners.delete(listener);
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * Notify listeners of preference changes
   */
  private notifyListeners(): void {
    const currentPreferences = { ...this.preferences };
    for (const listener of this.listeners) {
      try {
        listener(currentPreferences);
      } catch (error) {
        // Silently catch listener errors
      }
    }
  }
}

// Singleton instance (without storage adapter - must be configured per platform)
export const avatarPreferencesManager = new AvatarPreferencesManager();
