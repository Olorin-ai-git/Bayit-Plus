/**
 * useDeviceRegistration Hook
 * Automatically registers the current device on login
 */

import { useEffect, useRef } from 'react';
import { useDevicesStore } from '../stores/devicesStore';
import { deviceService } from '../services/deviceService';

interface UseDeviceRegistrationOptions {
  enabled?: boolean; // Default: true
  onSuccess?: (deviceId: string) => void;
  onError?: (error: Error) => void;
}

export const useDeviceRegistration = (options: UseDeviceRegistrationOptions = {}) => {
  const { enabled = true, onSuccess, onError } = options;
  const { registerDevice } = useDevicesStore();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!enabled || registeredRef.current) {
      return;
    }

    const registerCurrentDevice = async () => {
      try {
        // Generate device fingerprint
        const deviceId = await deviceService.generateDeviceId();

        // Get device metadata
        const deviceName = deviceService.getDeviceName();
        const deviceType = deviceService.getDeviceType();
        const browser = deviceService.getBrowserName();
        const os = deviceService.getOSName();
        const platform = deviceService.getPlatform();

        // Register device
        await registerDevice({
          device_id: deviceId,
          device_name: deviceName,
          device_type: deviceType,
          browser,
          os,
          platform,
        });

        // Store device ID in localStorage for quick access
        localStorage.setItem('current_device_id', deviceId);

        registeredRef.current = true;

        if (onSuccess) {
          onSuccess(deviceId);
        }

        console.log('Device registered successfully:', deviceId);
      } catch (error) {
        console.error('Failed to register device:', error);

        if (onError) {
          onError(error as Error);
        }
      }
    };

    registerCurrentDevice();
  }, [enabled, registerDevice, onSuccess, onError]);

  return {
    getCurrentDeviceId: () => localStorage.getItem('current_device_id'),
  };
};
