/**
 * Home Page Configuration Store
 * Manages home page section visibility and ordering preferences
 * Persists to AsyncStorage with API sync for cross-device consistency
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profilesService } from '../services/api';
import type {
  HomeSectionId,
  HomeSectionConfig,
  HomePagePreferences,
} from '../types/homePageConfig';
import {
  DEFAULT_HOME_PAGE_PREFERENCES,
  getSortedVisibleSections,
  getHiddenSections,
  reorderSection,
  toggleSectionVisibility,
} from '../types/homePageConfig';

interface HomePageConfigStore {
  /** Current preferences */
  preferences: HomePagePreferences;
  /** Whether preferences are being loaded from API */
  loading: boolean;
  /** Whether preferences are being saved to API */
  saving: boolean;
  /** Error message if last operation failed */
  error: string | null;

  // Derived getters
  /** Get sections that are visible, sorted by order */
  getVisibleSections: () => HomeSectionConfig[];
  /** Get sections that are hidden */
  getHiddenSections: () => HomeSectionConfig[];

  // Actions
  /** Load preferences from API */
  loadPreferences: () => Promise<void>;
  /** Update section order (move a section to a new position) */
  updateSectionOrder: (sectionId: HomeSectionId, newOrder: number) => Promise<void>;
  /** Toggle section visibility (show/hide) */
  toggleSection: (sectionId: HomeSectionId) => Promise<void>;
  /** Move section up in the visible list */
  moveSectionUp: (sectionId: HomeSectionId) => Promise<void>;
  /** Move section down in the visible list */
  moveSectionDown: (sectionId: HomeSectionId) => Promise<void>;
  /** Reset all sections to default configuration */
  resetToDefaults: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

export const useHomePageConfigStore = create<HomePageConfigStore>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_HOME_PAGE_PREFERENCES,
      loading: false,
      saving: false,
      error: null,

      getVisibleSections: () => {
        return getSortedVisibleSections(get().preferences.sections);
      },

      getHiddenSections: () => {
        return getHiddenSections(get().preferences.sections);
      },

      loadPreferences: async () => {
        set({ loading: true, error: null });
        try {
          const data = await profilesService.getHomePagePreferences();
          // Merge with defaults to handle new sections that may have been added
          const mergedSections = mergeSectionsWithDefaults(
            data.sections,
            DEFAULT_HOME_PAGE_PREFERENCES.sections
          );
          set({
            preferences: { sections: mergedSections },
            loading: false,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load preferences';
          console.error('[HomePageConfigStore] Failed to load preferences:', error);
          set({ loading: false, error: errorMessage });
        }
      },

      updateSectionOrder: async (sectionId: HomeSectionId, newOrder: number) => {
        const current = get().preferences;
        const updatedSections = reorderSection(current.sections, sectionId, newOrder);
        const updated = { sections: updatedSections };

        // Optimistic update
        set({ preferences: updated, saving: true, error: null });

        try {
          await profilesService.updateHomePagePreferences(updated);
          set({ saving: false });
        } catch (error: unknown) {
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : 'Failed to save preferences';
          console.error('[HomePageConfigStore] Failed to update section order:', error);
          set({
            preferences: current,
            saving: false,
            error: errorMessage,
          });
        }
      },

      toggleSection: async (sectionId: HomeSectionId) => {
        const current = get().preferences;
        const updatedSections = toggleSectionVisibility(current.sections, sectionId);
        const updated = { sections: updatedSections };

        // Optimistic update
        set({ preferences: updated, saving: true, error: null });

        try {
          await profilesService.updateHomePagePreferences(updated);
          set({ saving: false });
        } catch (error: unknown) {
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : 'Failed to save preferences';
          console.error('[HomePageConfigStore] Failed to toggle section:', error);
          set({
            preferences: current,
            saving: false,
            error: errorMessage,
          });
        }
      },

      moveSectionUp: async (sectionId: HomeSectionId) => {
        const visibleSections = get().getVisibleSections();
        const sectionIndex = visibleSections.findIndex((s) => s.id === sectionId);

        if (sectionIndex <= 0) return; // Already at top or not found

        const targetOrder = visibleSections[sectionIndex - 1].order;
        await get().updateSectionOrder(sectionId, targetOrder);
      },

      moveSectionDown: async (sectionId: HomeSectionId) => {
        const visibleSections = get().getVisibleSections();
        const sectionIndex = visibleSections.findIndex((s) => s.id === sectionId);

        if (sectionIndex < 0 || sectionIndex >= visibleSections.length - 1) return; // Already at bottom or not found

        const targetOrder = visibleSections[sectionIndex + 1].order;
        await get().updateSectionOrder(sectionId, targetOrder);
      },

      resetToDefaults: async () => {
        const current = get().preferences;

        // Optimistic update
        set({ preferences: DEFAULT_HOME_PAGE_PREFERENCES, saving: true, error: null });

        try {
          await profilesService.updateHomePagePreferences(DEFAULT_HOME_PAGE_PREFERENCES);
          set({ saving: false });
        } catch (error: unknown) {
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset preferences';
          console.error('[HomePageConfigStore] Failed to reset to defaults:', error);
          set({
            preferences: current,
            saving: false,
            error: errorMessage,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'bayit-home-page-config',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);

/**
 * Merge saved sections with defaults to handle new sections
 * that may have been added since the user last saved preferences
 */
function mergeSectionsWithDefaults(
  savedSections: HomeSectionConfig[],
  defaultSections: HomeSectionConfig[]
): HomeSectionConfig[] {
  const savedIds = new Set(savedSections.map((s) => s.id));
  const mergedSections = [...savedSections];

  // Add any new default sections that weren't saved
  for (const defaultSection of defaultSections) {
    if (!savedIds.has(defaultSection.id)) {
      mergedSections.push({
        ...defaultSection,
        // Place new sections at the end
        order: mergedSections.length,
      });
    }
  }

  return mergedSections;
}

export default useHomePageConfigStore;
