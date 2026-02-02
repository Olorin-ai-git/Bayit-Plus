/**
 * Family Controls Store - Zustand state management for family controls.
 *
 * Manages:
 * - Kids section controls (age limit, enabled/disabled)
 * - Youngsters section controls (age limit, enabled/disabled)
 * - Content rating limits (G, PG, PG-13, R, TV-MA)
 * - Viewing hours restrictions
 * - Family PIN management
 *
 * Persists to AsyncStorage for cross-session consistency.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface FamilyControls {
  kids_enabled: boolean;
  kids_age_limit: number;
  youngsters_enabled: boolean;
  youngsters_age_limit: number;
  max_content_rating: 'G' | 'PG' | 'PG-13' | 'R' | 'TV-MA';
  viewing_hours_enabled: boolean;
  viewing_start_hour: number;
  viewing_end_hour: number;
  require_pin_for_changes: boolean;
}

interface FamilyControlsStore {
  // State
  controls: FamilyControls | null;
  hasFamilyPin: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  loadControls: (profileId?: string) => Promise<void>;
  updateControls: (updates: Partial<FamilyControls>) => Promise<void>;
  setFamilyPin: (pin: string) => Promise<boolean>;
  verifyFamilyPin: (pin: string) => Promise<boolean>;
  updatePin: (oldPin: string, newPin: string) => Promise<boolean>;
  resetControls: () => void;
  clearError: () => void;
}

const defaultControls: FamilyControls = {
  kids_enabled: true,
  kids_age_limit: 12,
  youngsters_enabled: true,
  youngsters_age_limit: 17,
  max_content_rating: 'PG-13',
  viewing_hours_enabled: false,
  viewing_start_hour: 6,
  viewing_end_hour: 22,
  require_pin_for_changes: true,
};

export const useFamilyControlsStore = create<FamilyControlsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      controls: null,
      hasFamilyPin: false,
      loading: false,
      error: null,

      // Load family controls from API
      loadControls: async (profileId?: string) => {
        set({ loading: true, error: null });

        try {
          const endpoint = profileId
            ? `/profiles/${profileId}/controls`
            : '/family/controls';

          const response = await api.get(endpoint);

          if (response) {
            set({
              controls: response as FamilyControls,
              hasFamilyPin: true,
              loading: false,
            });
          } else {
            // No controls set up yet
            set({
              controls: defaultControls,
              hasFamilyPin: false,
              loading: false,
            });
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
            // No controls found, use defaults
            set({
              controls: defaultControls,
              hasFamilyPin: false,
              loading: false,
            });
          } else {
            set({
              error: error.message || 'Failed to load family controls',
              loading: false,
            });
          }
        }
      },

      // Update family controls
      updateControls: async (updates: Partial<FamilyControls>) => {
        set({ loading: true, error: null });

        try {
          const currentControls = get().controls || defaultControls;
          const updatedControls = { ...currentControls, ...updates };

          const response = await api.patch('/family/controls', updatedControls);

          set({
            controls: response as FamilyControls,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to update family controls',
            loading: false,
          });
          throw error;
        }
      },

      // Set up family PIN (initial setup)
      setFamilyPin: async (pin: string) => {
        set({ loading: true, error: null });

        try {
          await api.post('/family/controls/setup', {
            pin,
            kids_age_limit: 12,
            youngsters_age_limit: 17,
          });

          set({
            hasFamilyPin: true,
            loading: false,
          });

          // Reload controls to get fresh data
          await get().loadControls();

          return true;
        } catch (error: any) {
          set({
            error: error.message || 'Failed to set family PIN',
            loading: false,
          });
          return false;
        }
      },

      // Verify family PIN
      verifyFamilyPin: async (pin: string) => {
        try {
          const response = await api.post('/family/controls/verify-pin', { pin });
          return response?.valid === true;
        } catch (error) {
          return false;
        }
      },

      // Update family PIN
      updatePin: async (oldPin: string, newPin: string) => {
        set({ loading: true, error: null });

        try {
          await api.post('/family/controls/update-pin', {
            old_pin: oldPin,
            new_pin: newPin,
          });

          set({ loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error.message || 'Failed to update PIN',
            loading: false,
          });
          return false;
        }
      },

      // Reset to defaults
      resetControls: () => {
        set({
          controls: defaultControls,
          hasFamilyPin: false,
          error: null,
        });
      },

      // Clear error state
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'bayit-family-controls',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist controls and hasFamilyPin, not loading/error states
        controls: state.controls,
        hasFamilyPin: state.hasFamilyPin,
      }),
    }
  )
);

// Selectors for convenient access
export const selectControls = (state: FamilyControlsStore) => state.controls;
export const selectHasFamilyPin = (state: FamilyControlsStore) => state.hasFamilyPin;
export const selectLoading = (state: FamilyControlsStore) => state.loading;
export const selectError = (state: FamilyControlsStore) => state.error;

// Helper functions
export const isKidsEnabled = (controls: FamilyControls | null): boolean => {
  return controls?.kids_enabled ?? true;
};

export const isYoungstersEnabled = (controls: FamilyControls | null): boolean => {
  return controls?.youngsters_enabled ?? true;
};

export const isViewingAllowed = (controls: FamilyControls | null): boolean => {
  if (!controls || !controls.viewing_hours_enabled) {
    return true;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const { viewing_start_hour, viewing_end_hour } = controls;

  // Handle overnight ranges (e.g., 22:00 to 06:00)
  if (viewing_start_hour <= viewing_end_hour) {
    return currentHour >= viewing_start_hour && currentHour < viewing_end_hour;
  } else {
    return currentHour >= viewing_start_hour || currentHour < viewing_end_hour;
  }
};
