/**
 * Family Controls Store Types
 *
 * Type definitions and default values for family controls.
 */

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

export interface FamilyControlsStore {
  // State
  controls: FamilyControls | null;
  hasFamilyPin: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  loadControls: (profileId?: string) => Promise<void>;
  updateControls: (updates: Partial<FamilyControls>) => Promise<void>;
  toggleKidsSection: () => Promise<void>;
  toggleYoungstersSection: () => Promise<void>;
  toggleViewingHours: () => Promise<void>;
  updateKidsAgeLimit: (ageLimit: number) => Promise<void>;
  updateYoungstersAgeLimit: (ageLimit: number) => Promise<void>;
  updateContentRating: (rating: 'G' | 'PG' | 'PG-13' | 'R' | 'TV-MA') => Promise<void>;
  updateViewingHours: (startHour: number, endHour: number) => Promise<void>;
  setFamilyPin: (pin: string) => Promise<boolean>;
  verifyFamilyPin: (pin: string) => Promise<boolean>;
  updatePin: (oldPin: string, newPin: string) => Promise<boolean>;
  resetControls: () => void;
  clearError: () => void;
}

export const defaultControls: FamilyControls = {
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
