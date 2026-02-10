/**
 * AI Settings Store
 * Manages AI-related user preferences (chatbot, recommendations, data collection)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { profilesService } from '@/services/api';
import logger from '@/utils/logger';
import i18n from 'i18next';

export interface AIPreferences {
  chatbot_enabled: boolean;
  save_conversation_history: boolean;
  personalized_recommendations: boolean;
  data_collection_consent: boolean;
}

const DEFAULT_AI_PREFERENCES: AIPreferences = {
  chatbot_enabled: true,
  save_conversation_history: true,
  personalized_recommendations: true,
  data_collection_consent: false,
};

interface AISettingsStore {
  preferences: AIPreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<AIPreferences>) => Promise<void>;
  toggleSetting: (key: keyof AIPreferences) => Promise<void>;
  resetToDefaults: () => void;
}

export const useAISettingsStore = create<AISettingsStore>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_AI_PREFERENCES,
      loading: false,
      saving: false,
      error: null,

      loadPreferences: async () => {
        set({ loading: true, error: null });
        try {
          const data = await profilesService.getVoicePreferences();
          set({
            preferences: { ...DEFAULT_AI_PREFERENCES, ...data },
            loading: false,
          });
        } catch (error: any) {
          // Handle 401 gracefully - user not authenticated, use defaults
          if (error?.response?.status === 401 || error?.status === 401) {
            logger.debug('User not authenticated, using default AI preferences', 'aiSettingsStore');
            set({
              preferences: DEFAULT_AI_PREFERENCES,
              loading: false,
              error: null, // No error for unauthenticated users
            });
          } else {
            logger.error('Failed to load AI preferences', 'aiSettingsStore', error);
            set({ loading: false, error: error.message || i18n.t('errors.settings.loadFailed') });
          }
        }
      },

      updatePreferences: async (updates) => {
        const current = get().preferences;
        const updated = { ...current, ...updates };

        // Optimistic update
        set({ preferences: updated, saving: true, error: null });

        try {
          await profilesService.updateVoicePreferences(updated as any);
          set({ saving: false });
        } catch (error: any) {
          // Rollback on error
          logger.error('Failed to update AI preferences', 'aiSettingsStore', error);
          set({
            preferences: current,
            saving: false,
            error: error.message || i18n.t('errors.settings.saveFailed'),
          });
        }
      },

      toggleSetting: async (key) => {
        const current = get().preferences;
        await get().updatePreferences({ [key]: !current[key] });
      },

      resetToDefaults: () => {
        set({ preferences: DEFAULT_AI_PREFERENCES });
      },
    }),
    {
      name: 'bayit-ai-settings',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);

export default useAISettingsStore;
