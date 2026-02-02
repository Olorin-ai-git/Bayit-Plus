/**
 * Family Controls Store Helpers
 *
 * Utility functions and selectors for family controls.
 */

import type { FamilyControls, FamilyControlsStore } from './familyControlsStore';

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
