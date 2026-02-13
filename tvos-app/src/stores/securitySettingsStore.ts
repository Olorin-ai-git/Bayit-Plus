/**
 * Security Settings Store for tvOS
 * Manages security status display with backend integration
 */

import { create } from 'zustand';
import { api } from '@bayit/shared-services';

interface SecurityStatus {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  lastPasswordChange: string | null;
  loginNotifications: boolean;
  lastLoginAt: string | null;
  lastLoginFrom: string | null;
}

interface SecuritySettingsState {
  securityStatus: SecurityStatus | null;
  isLoading: boolean;
  error: string | null;

  loadSecuritySettings: () => Promise<void>;
}

export const useSecuritySettingsStore = create<SecuritySettingsState>((set) => ({
  securityStatus: null,
  isLoading: false,
  error: null,

  loadSecuritySettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/security/settings');

      set({
        securityStatus: response,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load security settings',
        isLoading: false,
      });
    }
  },
}));

export default useSecuritySettingsStore;
