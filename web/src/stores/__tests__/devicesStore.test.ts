/**
 * Test suite for devicesStore (Zustand)
 * Tests device CRUD operations, heartbeat updates,
 * optimistic state changes, and error handling.
 */

import { useDevicesStore } from '../devicesStore';

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

const api = require('@/services/api').default;

function resetStore() {
  useDevicesStore.setState({
    devices: [],
    loading: false,
    disconnecting: null,
    error: null,
  });
}

describe('devicesStore', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  // MARK: - Initial State

  describe('initial state', () => {
    it('starts with empty devices list', () => {
      expect(useDevicesStore.getState().devices).toEqual([]);
    });

    it('starts not loading', () => {
      expect(useDevicesStore.getState().loading).toBe(false);
    });

    it('starts with no disconnecting device', () => {
      expect(useDevicesStore.getState().disconnecting).toBeNull();
    });

    it('starts with no error', () => {
      expect(useDevicesStore.getState().error).toBeNull();
    });
  });

  // MARK: - loadDevices

  describe('loadDevices', () => {
    it('fetches and stores devices', async () => {
      const devices = [
        {
          device_id: 'd1',
          device_name: 'Chrome Browser',
          device_type: 'browser',
          browser: 'Chrome',
          os: 'macOS',
          platform: 'web',
          last_active: '2026-01-01T00:00:00Z',
          registered_at: '2025-12-01T00:00:00Z',
          is_current: true,
        },
        {
          device_id: 'd2',
          device_name: 'iPhone 15',
          device_type: 'mobile',
          browser: null,
          os: 'iOS',
          platform: 'ios',
          last_active: '2026-01-01T00:00:00Z',
          registered_at: '2025-12-01T00:00:00Z',
          is_current: false,
        },
      ];
      api.get.mockResolvedValue({ devices });

      await useDevicesStore.getState().loadDevices();

      expect(useDevicesStore.getState().devices).toEqual(devices);
      expect(useDevicesStore.getState().loading).toBe(false);
      expect(useDevicesStore.getState().error).toBeNull();
    });

    it('sets loading during fetch', async () => {
      let resolveLoad: (value: any) => void;
      api.get.mockReturnValue(
        new Promise((resolve) => {
          resolveLoad = resolve;
        })
      );

      const loadPromise = useDevicesStore.getState().loadDevices();
      expect(useDevicesStore.getState().loading).toBe(true);

      resolveLoad!({ devices: [] });
      await loadPromise;

      expect(useDevicesStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      api.get.mockRejectedValue({ detail: 'Unauthorized' });

      await useDevicesStore.getState().loadDevices();

      expect(useDevicesStore.getState().error).toBe('Unauthorized');
      expect(useDevicesStore.getState().loading).toBe(false);
    });

    it('uses i18n fallback when error has no detail', async () => {
      api.get.mockRejectedValue({});

      await useDevicesStore.getState().loadDevices();

      expect(useDevicesStore.getState().error).toBe('errors.devices.loadFailed');
    });

    it('clears error before new load', async () => {
      useDevicesStore.setState({ error: 'Previous error' });
      api.get.mockResolvedValue({ devices: [] });

      await useDevicesStore.getState().loadDevices();

      expect(useDevicesStore.getState().error).toBeNull();
    });
  });

  // MARK: - registerDevice

  describe('registerDevice', () => {
    it('adds new device to list', async () => {
      const newDevice = {
        device_id: 'd1',
        device_name: 'New Device',
        device_type: 'browser',
        browser: 'Firefox',
        os: 'Linux',
        platform: 'web',
        last_active: '2026-01-01T00:00:00Z',
        registered_at: '2026-01-01T00:00:00Z',
        is_current: true,
      };
      api.post.mockResolvedValue(newDevice);

      await useDevicesStore.getState().registerDevice({
        device_id: 'd1',
        device_name: 'New Device',
        device_type: 'browser',
        browser: 'Firefox',
        os: 'Linux',
        platform: 'web',
      });

      expect(useDevicesStore.getState().devices).toHaveLength(1);
      expect(useDevicesStore.getState().devices[0]).toEqual(newDevice);
    });

    it('updates existing device when device_id matches', async () => {
      const existingDevice = {
        device_id: 'd1',
        device_name: 'Old Name',
        device_type: 'browser',
        browser: 'Chrome',
        os: 'macOS',
        platform: 'web',
        last_active: '2026-01-01T00:00:00Z',
        registered_at: '2025-12-01T00:00:00Z',
        is_current: true,
      };
      useDevicesStore.setState({ devices: [existingDevice] });

      const updatedDevice = {
        ...existingDevice,
        device_name: 'Updated Name',
        last_active: '2026-02-01T00:00:00Z',
      };
      api.post.mockResolvedValue(updatedDevice);

      await useDevicesStore.getState().registerDevice({
        device_id: 'd1',
        device_name: 'Updated Name',
        device_type: 'browser',
      });

      expect(useDevicesStore.getState().devices).toHaveLength(1);
      expect(useDevicesStore.getState().devices[0].device_name).toBe('Updated Name');
    });

    it('sets error and throws on failure', async () => {
      api.post.mockRejectedValue({ detail: 'Device limit reached' });

      await expect(
        useDevicesStore.getState().registerDevice({
          device_id: 'd1',
          device_name: 'Device',
          device_type: 'browser',
        })
      ).rejects.toBeDefined();

      expect(useDevicesStore.getState().error).toBe('Device limit reached');
    });

    it('uses i18n fallback when error has no detail', async () => {
      api.post.mockRejectedValue({});

      await expect(
        useDevicesStore.getState().registerDevice({
          device_id: 'd1',
          device_name: 'Device',
          device_type: 'browser',
        })
      ).rejects.toBeDefined();

      expect(useDevicesStore.getState().error).toBe('errors.devices.registerFailed');
    });
  });

  // MARK: - disconnectDevice

  describe('disconnectDevice', () => {
    it('removes device from list on success', async () => {
      useDevicesStore.setState({
        devices: [
          {
            device_id: 'd1',
            device_name: 'Device 1',
            device_type: 'browser',
            browser: null,
            os: null,
            platform: null,
            last_active: '2026-01-01T00:00:00Z',
            registered_at: '2025-12-01T00:00:00Z',
            is_current: false,
          },
          {
            device_id: 'd2',
            device_name: 'Device 2',
            device_type: 'mobile',
            browser: null,
            os: null,
            platform: null,
            last_active: '2026-01-01T00:00:00Z',
            registered_at: '2025-12-01T00:00:00Z',
            is_current: true,
          },
        ],
      });

      api.delete.mockResolvedValue({ success: true, terminated_sessions: 1 });

      const result = await useDevicesStore.getState().disconnectDevice('d1');

      expect(result.success).toBe(true);
      expect(result.terminated_sessions).toBe(1);
      expect(useDevicesStore.getState().devices).toHaveLength(1);
      expect(useDevicesStore.getState().devices[0].device_id).toBe('d2');
    });

    it('sets disconnecting during operation', async () => {
      let resolveDisconnect: (value: any) => void;
      api.delete.mockReturnValue(
        new Promise((resolve) => {
          resolveDisconnect = resolve;
        })
      );

      useDevicesStore.setState({
        devices: [{
          device_id: 'd1',
          device_name: 'Device',
          device_type: 'browser',
          browser: null,
          os: null,
          platform: null,
          last_active: '2026-01-01T00:00:00Z',
          registered_at: '2025-12-01T00:00:00Z',
          is_current: false,
        }],
      });

      const disconnectPromise = useDevicesStore.getState().disconnectDevice('d1');
      expect(useDevicesStore.getState().disconnecting).toBe('d1');

      resolveDisconnect!({ success: true, terminated_sessions: 0 });
      await disconnectPromise;

      expect(useDevicesStore.getState().disconnecting).toBeNull();
    });

    it('clears error before disconnect', async () => {
      useDevicesStore.setState({
        error: 'Old error',
        devices: [{
          device_id: 'd1',
          device_name: 'Device',
          device_type: 'browser',
          browser: null,
          os: null,
          platform: null,
          last_active: '2026-01-01T00:00:00Z',
          registered_at: '2025-12-01T00:00:00Z',
          is_current: false,
        }],
      });

      api.delete.mockResolvedValue({ success: true, terminated_sessions: 0 });

      await useDevicesStore.getState().disconnectDevice('d1');

      expect(useDevicesStore.getState().error).toBeNull();
    });

    it('sets error and clears disconnecting on failure', async () => {
      useDevicesStore.setState({
        devices: [{
          device_id: 'd1',
          device_name: 'Device',
          device_type: 'browser',
          browser: null,
          os: null,
          platform: null,
          last_active: '2026-01-01T00:00:00Z',
          registered_at: '2025-12-01T00:00:00Z',
          is_current: false,
        }],
      });

      api.delete.mockRejectedValue({ detail: 'Cannot disconnect current device' });

      await expect(
        useDevicesStore.getState().disconnectDevice('d1')
      ).rejects.toBeDefined();

      expect(useDevicesStore.getState().error).toBe('Cannot disconnect current device');
      expect(useDevicesStore.getState().disconnecting).toBeNull();
    });
  });

  // MARK: - updateHeartbeat

  describe('updateHeartbeat', () => {
    it('updates last_active for device', async () => {
      const originalDate = '2026-01-01T00:00:00Z';
      useDevicesStore.setState({
        devices: [
          {
            device_id: 'd1',
            device_name: 'Device',
            device_type: 'browser',
            browser: null,
            os: null,
            platform: null,
            last_active: originalDate,
            registered_at: '2025-12-01T00:00:00Z',
            is_current: true,
          },
        ],
      });

      api.post.mockResolvedValue(undefined);

      await useDevicesStore.getState().updateHeartbeat('d1');

      const device = useDevicesStore.getState().devices[0];
      expect(device.last_active).not.toBe(originalDate);
    });

    it('does not update other devices', async () => {
      useDevicesStore.setState({
        devices: [
          {
            device_id: 'd1',
            device_name: 'Device 1',
            device_type: 'browser',
            browser: null,
            os: null,
            platform: null,
            last_active: '2026-01-01T00:00:00Z',
            registered_at: '2025-12-01T00:00:00Z',
            is_current: true,
          },
          {
            device_id: 'd2',
            device_name: 'Device 2',
            device_type: 'mobile',
            browser: null,
            os: null,
            platform: null,
            last_active: '2026-01-01T00:00:00Z',
            registered_at: '2025-12-01T00:00:00Z',
            is_current: false,
          },
        ],
      });

      api.post.mockResolvedValue(undefined);

      await useDevicesStore.getState().updateHeartbeat('d1');

      expect(useDevicesStore.getState().devices[1].last_active).toBe('2026-01-01T00:00:00Z');
    });

    it('does not set error on heartbeat failure', async () => {
      useDevicesStore.setState({
        devices: [{
          device_id: 'd1',
          device_name: 'Device',
          device_type: 'browser',
          browser: null,
          os: null,
          platform: null,
          last_active: '2026-01-01T00:00:00Z',
          registered_at: '2025-12-01T00:00:00Z',
          is_current: true,
        }],
      });

      api.post.mockRejectedValue(new Error('Network error'));

      await useDevicesStore.getState().updateHeartbeat('d1');

      // Heartbeat failures are not critical - error should not be set
      expect(useDevicesStore.getState().error).toBeNull();
    });

    it('calls api with correct endpoint', async () => {
      useDevicesStore.setState({
        devices: [{
          device_id: 'd1',
          device_name: 'Device',
          device_type: 'browser',
          browser: null,
          os: null,
          platform: null,
          last_active: '2026-01-01T00:00:00Z',
          registered_at: '2025-12-01T00:00:00Z',
          is_current: true,
        }],
      });

      api.post.mockResolvedValue(undefined);

      await useDevicesStore.getState().updateHeartbeat('d1');

      expect(api.post).toHaveBeenCalledWith('/devices/heartbeat', { device_id: 'd1' });
    });
  });
});
