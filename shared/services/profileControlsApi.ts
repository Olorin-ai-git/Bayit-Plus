/**
 * Profile Controls API Service
 *
 * Platform-agnostic API client for profile-aware family controls operations.
 * Supports web, mobile, and tvOS platforms via dependency injection.
 */

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

interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar: string | null;
  avatar_color: string | null;
  is_kids_profile: boolean;
  has_pin: boolean;
  inherit_household_controls: boolean;
  custom_controls_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileControlsApi {
  getEffectiveControls(profileId: string): Promise<FamilyControls | null>;
  setCustomControls(profileId: string, controlsId: string): Promise<Profile>;
  inheritHouseholdControls(profileId: string): Promise<Profile>;
  getControlsSource(profileId: string): Promise<ControlsSource>;
}

/**
 * Generic API client implementation using injected HTTP client
 */
class ProfileControlsApiClient implements ProfileControlsApi {
  private apiClient: any;

  constructor(apiClient: any) {
    this.apiClient = apiClient;
  }

  async getEffectiveControls(profileId: string): Promise<FamilyControls | null> {
    const response = await this.apiClient.get(`/profile-controls/${profileId}`);
    return response.data;
  }

  async setCustomControls(profileId: string, controlsId: string): Promise<Profile> {
    const response = await this.apiClient.post(
      `/profile-controls/${profileId}/set-custom`,
      { controls_id: controlsId }
    );
    return response.data;
  }

  async inheritHouseholdControls(profileId: string): Promise<Profile> {
    const response = await this.apiClient.post(
      `/profile-controls/${profileId}/inherit-household`
    );
    return response.data;
  }

  async getControlsSource(profileId: string): Promise<ControlsSource> {
    const response = await this.apiClient.get(
      `/profile-controls/${profileId}/source`
    );
    return response.data;
  }
}

// Export singleton instance (will be initialized via setApiClient)
let profileControlsApiInstance: ProfileControlsApi | null = null;

export const setApiClient = (apiClient: any) => {
  profileControlsApiInstance = new ProfileControlsApiClient(apiClient);
};

export const profileControlsApi = {
  getEffectiveControls: (profileId: string) => {
    if (!profileControlsApiInstance) {
      throw new Error('ProfileControls API not initialized. Call setApiClient first.');
    }
    return profileControlsApiInstance.getEffectiveControls(profileId);
  },
  setCustomControls: (profileId: string, controlsId: string) => {
    if (!profileControlsApiInstance) {
      throw new Error('ProfileControls API not initialized. Call setApiClient first.');
    }
    return profileControlsApiInstance.setCustomControls(profileId, controlsId);
  },
  inheritHouseholdControls: (profileId: string) => {
    if (!profileControlsApiInstance) {
      throw new Error('ProfileControls API not initialized. Call setApiClient first.');
    }
    return profileControlsApiInstance.inheritHouseholdControls(profileId);
  },
  getControlsSource: (profileId: string) => {
    if (!profileControlsApiInstance) {
      throw new Error('ProfileControls API not initialized. Call setApiClient first.');
    }
    return profileControlsApiInstance.getControlsSource(profileId);
  },
};
