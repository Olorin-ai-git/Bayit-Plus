import { useState, useEffect, useCallback } from 'react';
import { Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTV as isTVPlatform } from '../utils/platform';
import logger from '../utils/logger';

const layoutLogger = logger.scope('DeviceLayout');

/**
 * Device layout types
 */
export enum LayoutMode {
  PHONE_VERTICAL = 'phone_vertical',    // TikTok-style vertical feed
  PHONE_GRID = 'phone_grid',            // Traditional grid layout
  TABLET_GRID = 'tablet_grid',          // Larger grid for tablets
  TV_CINEMATIC = 'tv_cinematic',        // Full TV cinematic experience
}

interface LayoutState {
  mode: LayoutMode;
  isPhone: boolean;
  isTablet: boolean;
  isTV: boolean;
  isPortrait: boolean;
  screenWidth: number;
  screenHeight: number;
}

interface LayoutStyles {
  containerPadding: number;
  gridColumns: number;
  cardWidth: number;
  cardHeight: number;
  headerHeight: number;
  showSidebar: boolean;
  heroHeight: string | number;
  fontSize: {
    title: number;
    subtitle: number;
    body: number;
  };
}

const STORAGE_KEY = 'bayit-layout-preference';

/**
 * useDeviceLayout Hook
 * Detects device type and returns appropriate layout configuration for React Native.
 */
export function useDeviceLayout(userPreference?: LayoutMode | null): LayoutState {
  const [layout, setLayout] = useState<LayoutState>(() => {
    const { width, height } = Dimensions.get('window');
    return {
      mode: isTVPlatform ? LayoutMode.TV_CINEMATIC : LayoutMode.PHONE_GRID,
      isPhone: !isTVPlatform && width < 768,
      isTablet: !isTVPlatform && width >= 768,
      isTV: isTVPlatform,
      isPortrait: height > width,
      screenWidth: width,
      screenHeight: height,
    };
  });

  const detectLayout = useCallback(() => {
    const { width, height } = Dimensions.get('window');
    const isPortrait = height > width;

    // Detect device type
    const isTV = isTVPlatform;
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
 * useLayoutPreference Hook
 * Manages user's layout preference stored in AsyncStorage.
 */
export function useLayoutPreference() {
  const [preference, setPreference] = useState<LayoutMode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && Object.values(LayoutMode).includes(stored as LayoutMode)) {
          setPreference(stored as LayoutMode);
        }
      } catch (err) {
        layoutLogger.error('Failed to load layout preference', err);
      } finally {
        setLoading(false);
      }
    };

    loadPreference();
  }, []);

  const updatePreference = useCallback(async (mode: LayoutMode) => {
    try {
      setPreference(mode);
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (err) {
      layoutLogger.error('Failed to save layout preference', err);
    }
  }, []);

  const clearPreference = useCallback(async () => {
    try {
      setPreference(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      layoutLogger.error('Failed to clear layout preference', err);
    }
  }, []);

  return {
    preference,
    loading,
    updatePreference,
    clearPreference,
  };
}

/**
 * Get layout-specific styles
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
 * Returns different values based on current layout mode.
 */
export function useResponsiveValue<T>(values: Partial<Record<LayoutMode | 'default', T>>): T {
  const { mode } = useDeviceLayout();

  if (values[mode]) {
    return values[mode]!;
  }

  return values.default || values[Object.keys(values)[0] as LayoutMode]!;
}

export default useDeviceLayout;
