import { create } from 'zustand';
import axios from 'axios';

interface Device {
  device_id: string;
  device_name: string;
  device_type: string;
  browser: string | null;
  os: string | null;
  platform: string | null;
  last_active: string;
  registered_at: string;
  is_current: boolean;
}

interface DevicesStore {
  devices: Device[];
  loading: boolean;
  disconnecting: string | null; // device_id being disconnected
  error: string | null;

  loadDevices: () => Promise<void>;
  registerDevice: (deviceInfo: {
    device_id: string;
    device_name: string;
    device_type: string;
    browser?: string;
    os?: string;
    platform?: string;
    ip_address?: string;
  }) => Promise<void>;
  disconnectDevice: (deviceId: string) => Promise<{ success: boolean; terminated_sessions: number }>;
  updateHeartbeat: (deviceId: string) => Promise<void>;
}

export const useDevicesStore = create<DevicesStore>((set, get) => ({
  devices: [],
  loading: false,
  disconnecting: null,
  error: null,

  loadDevices: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/v1/devices');
      set({ devices: response.data.devices, loading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to load devices',
        loading: false
      });
    }
  },

  registerDevice: async (deviceInfo) => {
    try {
      const response = await axios.post('/api/v1/devices/register', deviceInfo);

      // Optimistically update local state
      const existingIndex = get().devices.findIndex(
        (d) => d.device_id === deviceInfo.device_id
      );

      if (existingIndex !== -1) {
        // Update existing device
        const updatedDevices = [...get().devices];
        updatedDevices[existingIndex] = response.data;
        set({ devices: updatedDevices });
      } else {
        // Add new device
        set({ devices: [...get().devices, response.data] });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to register device' });
      throw error;
    }
  },

  disconnectDevice: async (deviceId: string) => {
    set({ disconnecting: deviceId, error: null });
    try {
      const response = await axios.delete(`/api/v1/devices/${deviceId}`);

      // Optimistically remove device from local state
      set({
        devices: get().devices.filter((d) => d.device_id !== deviceId),
        disconnecting: null
      });

      return {
        success: response.data.success,
        terminated_sessions: response.data.terminated_sessions
      };
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to disconnect device',
        disconnecting: null
      });
      throw error;
    }
  },

  updateHeartbeat: async (deviceId: string) => {
    try {
      await axios.post('/api/v1/devices/heartbeat', { device_id: deviceId });

      // Optimistically update last_active for this device
      const updatedDevices = get().devices.map((d) => {
        if (d.device_id === deviceId) {
          return { ...d, last_active: new Date().toISOString() };
        }
        return d;
      });
      set({ devices: updatedDevices });
    } catch (error: any) {
      // Heartbeat failures are not critical, just log
      console.warn('Failed to update device heartbeat:', error);
    }
  },
}));
