/**
 * Settings Store
 * Manages user preferences (comprehension quiz, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ComprehensionFrequency = 'off' | 'low' | 'normal' | 'high';

export interface UserSettings {
  comprehensionQuizEnabled: boolean;
  comprehensionQuizFrequency: ComprehensionFrequency;
}

const DEFAULT_SETTINGS: UserSettings = {
  comprehensionQuizEnabled: true,
  comprehensionQuizFrequency: 'normal',
};

interface SettingsStore extends UserSettings {
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: async (updates) => {
        set((state) => ({ ...state, ...updates }));
      },

      resetToDefaults: () => {
        set(DEFAULT_SETTINGS);
      },
    }),
    {
      name: 'user-settings',
    }
  )
);
