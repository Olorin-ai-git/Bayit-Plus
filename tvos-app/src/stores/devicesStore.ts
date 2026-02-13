/**
 * Devices Store for tvOS
 * Manages connected devices with backend integration
 */

import { create } from 'zustand';
import { api } from '@bayit/shared-services';

interface Device {
  device_id: string;
  device_name: string;
  device_type: 'mobile' | 'desktop' | 'tv' | 'tablet';
  os: string;
  platform: string;
  last_active: string;
  is_current: boolean;
}

interface DevicesState {
  devices: Device[];
  isLoading: boolean;
  isDisconnecting: string | null;
  error: string | null;
  successMessage: string | null;

  loadDevices: () => Promise<void>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  clearMessages: () => void;
}

export const useDevicesStore = create<DevicesState>((set, get) => ({
  devices: [],
  isLoading: false,
  isDisconnecting: null,
  error: null,
  successMessage: null,

  loadDevices: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/users/me/devices');

      set({
        devices: response.devices || response || [],
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load devices',
        isLoading: false,
      });
    }
  },

  disconnectDevice: async (deviceId: string) => {
    set({ isDisconnecting: deviceId, error: null, successMessage: null });

    try {
      await api.delete(`/devices/${deviceId}`);

      const { devices } = get();
      const updatedDevices = devices.filter(d => d.device_id !== deviceId);

      set({
        devices: updatedDevices,
        isDisconnecting: null,
        successMessage: 'Device disconnected successfully',
      });

      setTimeout(() => {
        set({ successMessage: null });
      }, 3000);
    } catch (error: any) {
      set({
        error: error.message || 'Failed to disconnect device',
        isDisconnecting: null,
      });
    }
  },

  clearMessages: () => {
    set({ error: null, successMessage: null });
  },
}));

export default useDevicesStore;
