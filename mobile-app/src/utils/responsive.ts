/**
 * Mobile Responsive Utilities
 *
 * Provides responsive breakpoint system for mobile-first design
 * - Device type detection (phone vs tablet)
 * - Screen size detection (small, medium, large, tablet)
 * - Responsive value selectors
 * - Grid column helpers
 * - Font size scaling
 * - Spacing helpers
 */

import { Dimensions } from 'react-native';

export enum DeviceType {
  PHONE = 'phone',
  TABLET = 'tablet',
}

export enum ScreenSize {
  SMALL = 'small',      // iPhone SE, Mini (< 390px)
  MEDIUM = 'medium',    // Standard iPhone (390-427px)
  LARGE = 'large',      // iPhone Pro Max (428px+)
  TABLET = 'tablet',    // iPad (768px+)
}

// Breakpoints (based on device width)
const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  small: 390,
  medium: 428,
};

/**
 * Get current device type (phone or tablet)
 */
export const getDeviceType = (): DeviceType => {
  const { width } = Dimensions.get('window');
  return width >= BREAKPOINTS.tablet ? DeviceType.TABLET : DeviceType.PHONE;
};

/**
 * Get current screen size category
 */
export const getScreenSize = (): ScreenSize => {
  const { width } = Dimensions.get('window');

  if (width >= BREAKPOINTS.tablet) return ScreenSize.TABLET;
  if (width >= BREAKPOINTS.medium) return ScreenSize.LARGE;
  if (width >= BREAKPOINTS.small) return ScreenSize.MEDIUM;
  return ScreenSize.SMALL;
};

/**
 * Responsive value selector
 * Picks the most specific value based on current device/screen size
 *
 * Priority: specific size > device type > first available value
 *
 * @example
 * const columns = responsive({ phone: 2, tablet: 4 })
 * const fontSize = responsive({ small: 14, medium: 16, large: 18, tablet: 20 })
 */
export const responsive = <T>(values: {
  phone?: T;
  tablet?: T;
  small?: T;
  medium?: T;
  large?: T;
}): T => {
  const screenSize = getScreenSize();
  const deviceType = getDeviceType();

  // Priority 1: specific screen size
  if (values[screenSize]) return values[screenSize]!;

  // Priority 2: device type
  if (values[deviceType]) return values[deviceType]!;

  // Priority 3: first available value
  return (values.phone || values.tablet || Object.values(values)[0]) as T;
};

/**
 * Grid columns helper
 * Returns number of columns based on device/screen size
 *
 * @example
 * const numColumns = getGridColumns({ phone: 2, tablet: 4 })
 */
export const getGridColumns = (config: {
  phone?: number;
  tablet?: number;
  small?: number;
  medium?: number;
  large?: number;
}): number => {
  return responsive(config);
};

/**
 * Font size helper with responsive scaling
 * Scales font sizes based on screen size for optimal readability
 *
 * Scale factors:
 * - Small phones (iPhone SE): 0.9x
 * - Standard phones: 1.0x
 * - Large phones (Pro Max): 1.05x
 * - Tablets (iPad): 1.2x
 *
 * @example
 * const fontSize = getFontSize(16) // 16px on standard phone, 19.2px on tablet
 */
export const getFontSize = (base: number): number => {
  const screenSize = getScreenSize();

  const scale = {
    [ScreenSize.SMALL]: 0.9,
    [ScreenSize.MEDIUM]: 1.0,
    [ScreenSize.LARGE]: 1.05,
    [ScreenSize.TABLET]: 1.2,
  };

  return base * scale[screenSize];
};

/**
 * Spacing helper with tablet scaling
 * Increases spacing on tablets for better visual hierarchy
 *
 * @example
 * const spacing = getSpacing(16) // 16px on phone, 24px on tablet
 */
export const getSpacing = (base: number): number => {
  const deviceType = getDeviceType();
  return deviceType === DeviceType.TABLET ? base * 1.5 : base;
};

/**
 * Check if current device is a phone
 */
export const isPhone = (): boolean => {
  return getDeviceType() === DeviceType.PHONE;
};

/**
 * Check if current device is a tablet
 */
export const isTablet = (): boolean => {
  return getDeviceType() === DeviceType.TABLET;
};

/**
 * Get current orientation
 */
export const getOrientation = (): 'portrait' | 'landscape' => {
  const { width, height } = Dimensions.get('window');
  return width > height ? 'landscape' : 'portrait';
};
