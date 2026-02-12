/**
 * Enhanced Avatar Store for Web
 * Integrates @bayit/shared-avatar-services with localStorage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AvatarGenerationService,
  avatarStateManager,
  AvatarPreferencesManager
} from '@bayit/shared-avatar-services';
import type {
  AvatarGenerationResult,
  AvatarGenerationProgress,
  AvatarState,
  AvatarPreferences,
  PreferencesStorageAdapter
} from '@bayit/shared-avatar-services';

// localStorage adapter for avatar preferences
class LocalStorageAdapter implements PreferencesStorageAdapter {
  private key = 'bayit-avatar-preferences';

  async save(preferences: AvatarPreferences): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(preferences));
  }

  async load(): Promise<AvatarPreferences | null> {
    const stored = localStorage.getItem(this.key);
    return stored ? JSON.parse(stored) : null;
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.key);
  }
}

// Configuration
const AVATAR_CONFIG = {
  apiKey: import.meta.env.VITE_ZEH_ANI_API_KEY || '',
  apiUrl: import.meta.env.VITE_ZEH_ANI_API_URL || 'https://api.zeh-ani.com'
};

// Initialize services
const avatarGenerationService = new AvatarGenerationService(AVATAR_CONFIG);
const storageAdapter = new LocalStorageAdapter();
const avatarPreferencesManager = new AvatarPreferencesManager({}, storageAdapter);

// Initialize preferences from storage
avatarPreferencesManager.initialize();

interface AvatarStoreState {
  // Avatar generation state
  currentAvatar: AvatarGenerationResult | null;
  generationProgress: AvatarGenerationProgress | null;
  isGenerating: boolean;

  // Avatar visual state
  avatarState: AvatarState;

  // Avatar preferences
  preferences: AvatarPreferences;

  // Actions - Generation
  generateAvatar: (userId: string, photoUrl: string) => Promise<void>;
  loadAvatar: (avatarId: string) => Promise<void>;
  deleteAvatar: () => Promise<void>;

  // Actions - State
  showAvatar: () => void;
  hideAvatar: () => void;
  syncEmotionWithVoice: (frustrationLevel: number) => void;
  startSpeaking: () => void;
  stopSpeaking: () => void;
  startListening: () => void;
  stopListening: () => void;

  // Actions - Preferences
  updatePreferences: (updates: Partial<AvatarPreferences>) => Promise<void>;
  enableAvatar: () => Promise<void>;
  disableAvatar: () => Promise<void>;
}

export const useEnhancedAvatarStore = create<AvatarStoreState>()(
  persist(
    (set, get) => {
      // Subscribe to avatar state manager changes
      avatarStateManager.addListener((state) => {
        set({ avatarState: state });
      });

      // Subscribe to preferences changes
      avatarPreferencesManager.addListener((preferences) => {
        set({ preferences });
      });

      return {
        // Initial state
        currentAvatar: null,
        generationProgress: null,
        isGenerating: false,
        avatarState: avatarStateManager.getState(),
        preferences: avatarPreferencesManager.getPreferences(),

        // Avatar generation
        generateAvatar: async (userId, photoUrl) => {
          set({ isGenerating: true, generationProgress: null });

          try {
            const result = await avatarGenerationService.generateAvatar({
              userId,
              photoUrl,
              style: get().preferences.style,
              quality: get().preferences.quality,
              options: {
                enableAnimations: get().preferences.animationsEnabled,
                enableEmotions: get().preferences.emotionsEnabled
              }
            });

            // Subscribe to progress updates
            const unsubscribe = avatarGenerationService.onProgress(result.avatarId, (progress) => {
              set({ generationProgress: progress });

              if (progress.status === 'completed') {
                set({ isGenerating: false });
                avatarPreferencesManager.setAvatarId(result.avatarId);
                unsubscribe();
              } else if (progress.status === 'failed') {
                set({ isGenerating: false, generationProgress: null });
                unsubscribe();
              }
            });

            set({ currentAvatar: result });
          } catch (error) {
            set({ isGenerating: false, generationProgress: null });
            throw error;
          }
        },

        loadAvatar: async (avatarId) => {
          try {
            const avatar = await avatarGenerationService.getAvatar(avatarId);
            if (avatar) {
              set({ currentAvatar: avatar });
              await avatarPreferencesManager.setAvatarId(avatarId);
            }
          } catch (error) {
            console.error('Failed to load avatar:', error);
          }
        },

        deleteAvatar: async () => {
          const { currentAvatar } = get();
          if (!currentAvatar) return;

          try {
            await avatarGenerationService.deleteAvatar(currentAvatar.avatarId);
            set({ currentAvatar: null });
            await avatarPreferencesManager.setAvatarId(undefined as any);
          } catch (error) {
            console.error('Failed to delete avatar:', error);
            throw error;
          }
        },

        // Avatar state management
        showAvatar: () => {
          avatarStateManager.show();
        },

        hideAvatar: () => {
          avatarStateManager.hide();
        },

        syncEmotionWithVoice: (frustrationLevel) => {
          avatarStateManager.setEmotionFromFrustration(frustrationLevel);
        },

        startSpeaking: () => {
          avatarStateManager.startSpeaking();
        },

        stopSpeaking: () => {
          avatarStateManager.stopSpeaking();
        },

        startListening: () => {
          avatarStateManager.startListening();
        },

        stopListening: () => {
          avatarStateManager.stopListening();
        },

        // Preferences management
        updatePreferences: async (updates) => {
          await avatarPreferencesManager.updatePreferences(updates);
        },

        enableAvatar: async () => {
          await avatarPreferencesManager.enable();
          avatarStateManager.show();
        },

        disableAvatar: async () => {
          await avatarPreferencesManager.disable();
          avatarStateManager.hide();
        },
      };
    },
    {
      name: 'bayit-enhanced-avatar',
      partialize: (state) => ({
        currentAvatar: state.currentAvatar,
      }),
    }
  )
);

export default useEnhancedAvatarStore;
