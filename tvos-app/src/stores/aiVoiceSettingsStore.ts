/**
 * AI/Voice Settings Store for tvOS
 * Manages AI assistant and voice/accessibility preferences with backend integration
 */

import { create } from 'zustand';
import { api } from '@bayit/shared-services';

interface AIPreferences {
  chatbot_enabled: boolean;
  save_conversation_history: boolean;
  personalized_recommendations: boolean;
  data_collection_consent: boolean;
}

interface VoicePreferences {
  voice_search_enabled: boolean;
  auto_subtitle: boolean;
  high_contrast_mode: boolean;
  text_size: 'small' | 'medium' | 'large';
  tts_enabled: boolean;
  tts_speed: number;
  tts_volume: number;
}

interface AIVoiceSettingsState {
  aiPreferences: AIPreferences | null;
  voicePreferences: VoicePreferences | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadPreferences: () => Promise<void>;
  updateAISetting: (key: keyof AIPreferences, value: any) => Promise<void>;
  updateVoiceSetting: (key: keyof VoicePreferences, value: any) => Promise<void>;
}

export const useAIVoiceSettingsStore = create<AIVoiceSettingsState>((set, get) => ({
  aiPreferences: null,
  voicePreferences: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadPreferences: async () => {
    set({ isLoading: true, error: null });

    try {
      const [aiResponse, voiceResponse] = await Promise.all([
        api.get('/preferences/ai'),
        api.get('/preferences/voice'),
      ]);

      set({
        aiPreferences: aiResponse,
        voicePreferences: voiceResponse,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load preferences',
        isLoading: false,
      });
    }
  },

  updateAISetting: async (key, value) => {
    const { aiPreferences } = get();
    if (!aiPreferences) return;

    const previousValue = aiPreferences[key];
    set({
      aiPreferences: { ...aiPreferences, [key]: value },
      isSaving: true,
      error: null,
    });

    try {
      await api.put('/preferences/ai', {
        ...aiPreferences,
        [key]: value,
      });

      set({ isSaving: false });
    } catch (error: any) {
      set({
        aiPreferences: { ...aiPreferences, [key]: previousValue },
        error: error.message || 'Failed to update AI preference',
        isSaving: false,
      });
    }
  },

  updateVoiceSetting: async (key, value) => {
    const { voicePreferences } = get();
    if (!voicePreferences) return;

    const previousValue = voicePreferences[key];
    set({
      voicePreferences: { ...voicePreferences, [key]: value },
      isSaving: true,
      error: null,
    });

    try {
      await api.put('/preferences/voice', {
        ...voicePreferences,
        [key]: value,
      });

      set({ isSaving: false });
    } catch (error: any) {
      set({
        voicePreferences: { ...voicePreferences, [key]: previousValue },
        error: error.message || 'Failed to update voice preference',
        isSaving: false,
      });
    }
  },
}));

export default useAIVoiceSettingsStore;
