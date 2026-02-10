/**
 * Family Controls Store - Zustand state management for family controls.
 * Manages kids/youngsters sections, content ratings, viewing hours, and Family PIN.
 * Persists to AsyncStorage for cross-session consistency.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import type { FamilyControls, FamilyControlsStore } from './familyControlsTypes';
import { defaultControls } from './familyControlsTypes';

export const useFamilyControlsStore = create<FamilyControlsStore>()(
  persist(
    (set, get) => ({
      controls: null,
      hasFamilyPin: false,
      loading: false,
      error: null,

      loadControls: async (profileId?: string) => {
        set({ loading: true, error: null });
        try {
          const endpoint = profileId ? `/profiles/${profileId}/controls` : '/family/controls';
          const data = await api.get(endpoint) as FamilyControls | null;
          if (data) {
            set({ controls: data, hasFamilyPin: true, loading: false });
          } else {
            set({ controls: defaultControls, hasFamilyPin: false, loading: false });
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
            set({ controls: defaultControls, hasFamilyPin: false, loading: false });
          } else {
            set({ error: error.message || 'Failed to load family controls', loading: false });
          }
        }
      },

      updateControls: async (updates: Partial<FamilyControls>) => {
        set({ loading: true, error: null });
        try {
          const currentControls = get().controls || defaultControls;
          const updatedControls = { ...currentControls, ...updates };
          const data = await api.patch('/family/controls', updatedControls) as FamilyControls;
          set({ controls: data, loading: false });
        } catch (error: any) {
          set({ error: error.message || 'Failed to update family controls', loading: false });
          throw error;
        }
      },

      setFamilyPin: async (pin: string) => {
        set({ loading: true, error: null });
        try {
          await api.post('/family/controls/setup', {
            pin,
            kids_age_limit: 12,
            youngsters_age_limit: 17,
          });
          set({ hasFamilyPin: true, loading: false });
          await get().loadControls();
          return true;
        } catch (error: any) {
          set({ error: error.message || 'Failed to set family PIN', loading: false });
          return false;
        }
      },

      verifyFamilyPin: async (pin: string) => {
        try {
          const data = await api.post('/family/controls/verify-pin', { pin });
          return data?.valid === true;
        } catch (error) {
          return false;
        }
      },

      updatePin: async (oldPin: string, newPin: string) => {
        set({ loading: true, error: null });
        try {
          await api.post('/family/controls/update-pin', { old_pin: oldPin, new_pin: newPin });
          set({ loading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message || 'Failed to update PIN', loading: false });
          return false;
        }
      },

      toggleKidsSection: async () => {
        const currentControls = get().controls;
        if (currentControls) {
          await get().updateControls({ kids_enabled: !currentControls.kids_enabled });
        }
      },

      toggleYoungstersSection: async () => {
        const currentControls = get().controls;
        if (currentControls) {
          await get().updateControls({ youngsters_enabled: !currentControls.youngsters_enabled });
        }
      },

      toggleViewingHours: async () => {
        const currentControls = get().controls;
        if (currentControls) {
          await get().updateControls({ viewing_hours_enabled: !currentControls.viewing_hours_enabled });
        }
      },

      updateKidsAgeLimit: async (ageLimit: number) => {
        await get().updateControls({ kids_age_limit: ageLimit });
      },

      updateYoungstersAgeLimit: async (ageLimit: number) => {
        await get().updateControls({ youngsters_age_limit: ageLimit });
      },

      updateContentRating: async (rating: 'G' | 'PG' | 'PG-13' | 'R' | 'TV-MA') => {
        await get().updateControls({ max_content_rating: rating });
      },

      updateViewingHours: async (startHour: number, endHour: number) => {
        await get().updateControls({
          viewing_start_hour: startHour,
          viewing_end_hour: endHour,
        });
      },

      resetControls: () => {
        set({ controls: defaultControls, hasFamilyPin: false, error: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'bayit-family-controls',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        controls: state.controls,
        hasFamilyPin: state.hasFamilyPin,
      }),
    }
  )
);

export * from './familyControlsHelpers';
export * from './familyControlsTypes';
