/**
 * useResponsive Hook
 *
 * Provides reactive responsive information that updates on dimension changes
 * (orientation changes, split-screen on iPad, etc.)
 */

import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import {
  getDeviceType,
  getScreenSize,
  getOrientation,
  DeviceType,
  ScreenSize,
} from '../utils/responsive';

export interface ResponsiveInfo {
  deviceType: DeviceType;
  screenSize: ScreenSize;
  isPhone: boolean;
  isTablet: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

/**
 * Hook to get responsive information with reactive updates
 *
 * Returns device type, screen size, dimensions, and orientation
 * Updates automatically when dimensions change (rotation, split-screen, etc.)
 *
 * @example
 * const { isPhone, isTablet, orientation, screenSize } = useResponsive();
 *
 * if (isPhone) {
 *   // Phone-specific layout
 * }
 *
 * const columns = orientation === 'landscape' ? 4 : 2;
 */
export const useResponsive = (): ResponsiveInfo => {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const onChange = ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);

    return () => subscription?.remove();
  }, []);

  const deviceType = getDeviceType();
  const screenSize = getScreenSize();
  const orientation = getOrientation();

  return {
    deviceType,
    screenSize,
    isPhone: deviceType === DeviceType.PHONE,
    isTablet: deviceType === DeviceType.TABLET,
    width: dimensions.width,
    height: dimensions.height,
    orientation,
  };
};
