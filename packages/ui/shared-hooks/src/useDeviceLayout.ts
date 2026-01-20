/**
 * useDeviceLayout Hook
 *
 * Detects device type and returns appropriate layout configuration.
 * Supports phone, tablet, and TV platforms.
 */

import { useState, useEffect, useCallback } from 'react';
import { Dimensions, Platform } from 'react-native';

/**
 * Device layout types
 */
export enum LayoutMode {
  PHONE_VERTICAL = 'phone_vertical', // TikTok-style vertical feed
  PHONE_GRID = 'phone_grid', // Traditional grid layout
  TABLET_GRID = 'tablet_grid', // Larger grid for tablets
  TV_CINEMATIC = 'tv_cinematic', // Full TV cinematic experience
}

export interface LayoutState {
  /** Current layout mode */
  mode: LayoutMode;
  /** Is the device a phone */
  isPhone: boolean;
  /** Is the device a tablet */
  isTablet: boolean;
  /** Is the device a TV */
  isTV: boolean;
  /** Is the device in portrait orientation */
  isPortrait: boolean;
  /** Screen width in pixels */
  screenWidth: number;
  /** Screen height in pixels */
  screenHeight: number;
}

export interface LayoutStyles {
  /** Container padding */
  containerPadding: number;
  /** Number of grid columns */
  gridColumns: number;
  /** Card width in pixels */
  cardWidth: number;
  /** Card height in pixels */
  cardHeight: number;
  /** Header height in pixels */
  headerHeight: number;
  /** Whether to show sidebar */
  showSidebar: boolean;
  /** Hero section height */
  heroHeight: string | number;
  /** Font sizes for different text types */
  fontSize: {
    title: number;
    subtitle: number;
    body: number;
  };
}

// Detect TV platform
const isTV = Platform.isTV || Platform.OS === 'android';

/**
 * useDeviceLayout Hook
 *
 * Detects device type and returns appropriate layout configuration for React Native.
 *
 * @param userPreference - Optional user-preferred layout mode
 * @returns Layout state with device info and layout mode
 *
 * @example
 * ```tsx
 * const { isTV, isPhone, mode, screenWidth } = useDeviceLayout();
 *
 * return (
 *   <View style={{ padding: isTV ? 48 : 12 }}>
 *     <Text>Screen width: {screenWidth}</Text>
 *   </View>
 * );
 * ```
 */
export function useDeviceLayout(userPreference?: LayoutMode | null): LayoutState {
  const [layout, setLayout] = useState<LayoutState>(() => {
    const { width, height } = Dimensions.get('window');
    return {
      mode: isTV ? LayoutMode.TV_CINEMATIC : LayoutMode.PHONE_GRID,
      isPhone: !isTV && width < 768,
      isTablet: !isTV && width >= 768,
      isTV,
      isPortrait: height > width,
      screenWidth: width,
      screenHeight: height,
    };
  });

  const detectLayout = useCallback(() => {
    const { width, height } = Dimensions.get('window');
    const isPortrait = height > width;

    // Detect device type
    const isPhone = !isTV && width < 768;
    const isTablet = !isTV && width >= 768;

    // Determine layout mode
    let mode: LayoutMode;
    if (userPreference) {
      mode = userPreference;
    } else if (isTV) {
      mode = LayoutMode.TV_CINEMATIC;
    } else if (isPhone) {
      mode = isPortrait ? LayoutMode.PHONE_VERTICAL : LayoutMode.PHONE_GRID;
    } else {
      mode = LayoutMode.TABLET_GRID;
    }

    setLayout({
      mode,
      isPhone,
      isTablet,
      isTV,
      isPortrait,
      screenWidth: width,
      screenHeight: height,
    });
  }, [userPreference]);

  useEffect(() => {
    detectLayout();

    const subscription = Dimensions.addEventListener('change', detectLayout);

    return () => {
      subscription?.remove();
    };
  }, [detectLayout]);

  return layout;
}

/**
 * Get layout-specific styles
 *
 * @param layout - Current layout state
 * @returns Layout styles object with dimensions and styling values
 */
export function getLayoutStyles(layout: LayoutState): LayoutStyles {
  const { mode, screenWidth, screenHeight } = layout;

  switch (mode) {
    case LayoutMode.PHONE_VERTICAL:
      return {
        containerPadding: 0,
        gridColumns: 1,
        cardWidth: screenWidth,
        cardHeight: screenHeight,
        headerHeight: 56,
        showSidebar: false,
        heroHeight: '100%',
        fontSize: {
          title: 24,
          subtitle: 16,
          body: 14,
        },
      };

    case LayoutMode.PHONE_GRID:
      return {
        containerPadding: 12,
        gridColumns: 2,
        cardWidth: (screenWidth - 36) / 2,
        cardHeight: ((screenWidth - 36) / 2) * 1.5,
        headerHeight: 56,
        showSidebar: false,
        heroHeight: screenHeight * 0.4,
        fontSize: {
          title: 20,
          subtitle: 14,
          body: 12,
        },
      };

    case LayoutMode.TABLET_GRID:
      return {
        containerPadding: 24,
        gridColumns: 3,
        cardWidth: (screenWidth - 96) / 3,
        cardHeight: ((screenWidth - 96) / 3) * 1.4,
        headerHeight: 64,
        showSidebar: true,
        heroHeight: screenHeight * 0.5,
        fontSize: {
          title: 28,
          subtitle: 18,
          body: 16,
        },
      };

    case LayoutMode.TV_CINEMATIC:
      return {
        containerPadding: 48,
        gridColumns: 5,
        cardWidth: (screenWidth - 288) / 5,
        cardHeight: ((screenWidth - 288) / 5) * 1.3,
        headerHeight: 80,
        showSidebar: true,
        heroHeight: screenHeight * 0.7,
        fontSize: {
          title: 48,
          subtitle: 24,
          body: 20,
        },
      };

    default:
      return {
        containerPadding: 24,
        gridColumns: 3,
        cardWidth: (screenWidth - 96) / 3,
        cardHeight: ((screenWidth - 96) / 3) * 1.4,
        headerHeight: 64,
        showSidebar: true,
        heroHeight: screenHeight * 0.5,
        fontSize: {
          title: 28,
          subtitle: 18,
          body: 16,
        },
      };
  }
}

/**
 * useResponsiveValue Hook
 *
 * Returns different values based on current layout mode.
 *
 * @param values - Object mapping layout modes to values
 * @returns Value for the current layout mode
 *
 * @example
 * ```tsx
 * const padding = useResponsiveValue({
 *   phone_vertical: 0,
 *   phone_grid: 12,
 *   tablet_grid: 24,
 *   tv_cinematic: 48,
 *   default: 16,
 * });
 * ```
 */
export function useResponsiveValue<T>(values: Partial<Record<LayoutMode | 'default', T>>): T {
  const { mode } = useDeviceLayout();

  if (values[mode]) {
    return values[mode]!;
  }

  return values.default || values[Object.keys(values)[0] as LayoutMode]!;
}

export default useDeviceLayout;
