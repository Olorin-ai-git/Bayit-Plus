import { create } from 'zustand';
import { profileControlsApi, ProfileControlsApi } from '../services/profileControlsApi';

interface FamilyControls {
  id: string;
  user_id: string;
  kids_enabled: boolean;
  kids_age_limit: number;
  youngsters_enabled: boolean;
  youngsters_age_limit: number;
  max_content_rating: string;
  viewing_hours_enabled: boolean;
  viewing_start_hour: number;
  viewing_end_hour: number;
  has_family_pin: boolean;
  created_at: string;
  updated_at: string;
}

interface ControlsSource {
  source: 'household' | 'custom' | 'none';
  controls_id: string | null;
  inherit_household_controls: boolean;
}

interface ProfileControlsState {
  effectiveControls: FamilyControls | null;
  controlsSource: ControlsSource | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadEffectiveControls: (profileId: string) => Promise<FamilyControls | null>;
  setCustomControls: (profileId: string, controlsId: string) => Promise<void>;
  inheritHouseholdControls: (profileId: string) => Promise<void>;
  getControlsSource: (profileId: string) => Promise<ControlsSource>;
  clearError: () => void;
}

// Allow injecting custom API client for different platforms
let apiClient: ProfileControlsApi | null = null;

export const setProfileControlsApiClient = (client: ProfileControlsApi) => {
  apiClient = client;
};

const getApiClient = (): ProfileControlsApi => {
  if (!apiClient) {
    throw new Error(
      'ProfileControls API client not initialized. Call setProfileControlsApiClient first.'
    );
  }
  return apiClient;
};

export const useProfileControlsStore = create<ProfileControlsState>((set) => ({
  effectiveControls: null,
  controlsSource: null,
  isLoading: false,
  error: null,

  loadEffectiveControls: async (profileId: string) => {
    set({ isLoading: true, error: null });
    try {
      const api = getApiClient();
      const controls = await api.getEffectiveControls(profileId);
      set({ effectiveControls: controls, isLoading: false });
      return controls;
    } catch (error: any) {
      const message = error.detail || error.message || 'Failed to load controls';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  setCustomControls: async (profileId: string, controlsId: string) => {
    set({ isLoading: true, error: null });
    try {
      const api = getApiClient();
      await api.setCustomControls(profileId, controlsId);

      // Reload effective controls after setting custom
      const controls = await api.getEffectiveControls(profileId);
      set({ effectiveControls: controls, isLoading: false });
    } catch (error: any) {
      const message = error.detail || error.message || 'Failed to set custom controls';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  inheritHouseholdControls: async (profileId: string) => {
    set({ isLoading: true, error: null });
    try {
      const api = getApiClient();
      await api.inheritHouseholdControls(profileId);

      // Reload effective controls after switching to household
      const controls = await api.getEffectiveControls(profileId);
      set({ effectiveControls: controls, isLoading: false });
    } catch (error: any) {
      const message = error.detail || error.message || 'Failed to inherit household controls';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  getControlsSource: async (profileId: string) => {
    set({ isLoading: true, error: null });
    try {
      const api = getApiClient();
      const source = await api.getControlsSource(profileId);
      set({ controlsSource: source, isLoading: false });
      return source;
    } catch (error: any) {
      const message = error.detail || error.message || 'Failed to get controls source';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
