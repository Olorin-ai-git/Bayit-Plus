import { create } from 'zustand';
import api from '@/services/api';
import logger from '@/utils/logger';

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
      const response = await api.get('/devices') as { devices: Device[] };
      set({ devices: response.devices, loading: false });
    } catch (error: any) {
      set({
        error: error?.detail || 'Failed to load devices',
        loading: false
      });
    }
  },

  registerDevice: async (deviceInfo) => {
    try {
      const device = await api.post('/devices/register', deviceInfo) as Device;

      // Optimistically update local state
      const existingIndex = get().devices.findIndex(
        (d) => d.device_id === deviceInfo.device_id
      );

      if (existingIndex !== -1) {
        // Update existing device
        const updatedDevices = [...get().devices];
        updatedDevices[existingIndex] = device;
        set({ devices: updatedDevices });
      } else {
        // Add new device
        set({ devices: [...get().devices, device] });
      }
    } catch (error: any) {
      set({ error: error?.detail || 'Failed to register device' });
      throw error;
    }
  },

  disconnectDevice: async (deviceId: string) => {
    set({ disconnecting: deviceId, error: null });
    try {
      const result = await api.delete(`/devices/${deviceId}`) as { success: boolean; terminated_sessions: number };

      // Optimistically remove device from local state
      set({
        devices: get().devices.filter((d) => d.device_id !== deviceId),
        disconnecting: null
      });

      return {
        success: result.success,
        terminated_sessions: result.terminated_sessions
      };
    } catch (error: any) {
      set({
        error: error?.detail || 'Failed to disconnect device',
        disconnecting: null
      });
      throw error;
    }
  },

  updateHeartbeat: async (deviceId: string) => {
    try {
      await api.post('/devices/heartbeat', { device_id: deviceId });

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
      logger.warn('Failed to update device heartbeat', 'DevicesStore', error);
    }
  },
}));
