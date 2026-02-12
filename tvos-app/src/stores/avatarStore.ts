/**
 * Avatar Store for tvOS
 * Integrates @bayit/shared-avatar-services for avatar generation and state management
 */

import { create } from 'zustand';
import {
  AvatarGenerationService,
  avatarStateManager,
  avatarPreferencesManager
} from '@bayit/shared-avatar-services';
import type {
  AvatarGenerationResult,
  AvatarGenerationProgress,
  AvatarState,
  AvatarPreferences
} from '@bayit/shared-avatar-services';

// Configuration from environment
const AVATAR_CONFIG = {
  apiKey: process.env.ZEH_ANI_API_KEY || '',
  apiUrl: process.env.ZEH_ANI_API_URL || 'https://api.zeh-ani.com'
};

// Initialize services
const avatarGenerationService = new AvatarGenerationService(AVATAR_CONFIG);

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
  cancelGeneration: () => void;

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

export const useAvatarStore = create<AvatarStoreState>((set, get) => {
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
        avatarGenerationService.onProgress(result.avatarId, (progress) => {
          set({ generationProgress: progress });

          if (progress.status === 'completed') {
            set({ isGenerating: false });
            // Update preferences with new avatar ID
            avatarPreferencesManager.setAvatarId(result.avatarId);
          } else if (progress.status === 'failed') {
            set({ isGenerating: false, generationProgress: null });
          }
        });

        set({ currentAvatar: result });
      } catch (error) {
        set({ isGenerating: false, generationProgress: null });
        throw error;
      }
    },

    cancelGeneration: () => {
      set({ isGenerating: false, generationProgress: null });
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
});

export default useAvatarStore;
