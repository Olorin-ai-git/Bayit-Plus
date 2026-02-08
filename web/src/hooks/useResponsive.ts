/**
 * useResponsive Hook
 *
 * Provides responsive utilities for adapting UI to different screen sizes.
 * Uses browser window.innerWidth directly (not RN useWindowDimensions)
 * to avoid incorrect initial values on React Native Web.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BREAKPOINTS,
  MOBILE_BREAKPOINT,
  TABLET_BREAKPOINT,
  GRID_COLUMNS,
  getBreakpoint,
} from '@/utils/responsive/breakpoints';

interface ColumnOptions {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
}

export interface ResponsiveState {
  /** Current window width */
  width: number;
  /** Current window height */
  height: number;
  /** True if mobile device (< 768px) */
  isMobile: boolean;
  /** True if tablet (768px - 1023px) */
  isTablet: boolean;
  /** True if desktop (>= 1024px) */
  isDesktop: boolean;
  /** True if portrait orientation */
  isPortrait: boolean;
  /** True if landscape orientation */
  isLandscape: boolean;
  /** Current breakpoint key */
  breakpoint: keyof typeof BREAKPOINTS;
  /**
   * Get responsive column count based on current width
   * @param options Column counts per breakpoint (defaults to GRID_COLUMNS)
   */
  getColumns: (options?: ColumnOptions) => number;
}

/**
 * Get current browser dimensions with fallback for SSR
 */
function getWindowDimensions() {
  if (typeof window !== 'undefined') {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return { width: 1024, height: 768 };
}

/**
 * Hook that provides responsive state and utilities.
 * Uses browser window.innerWidth directly to avoid React Native Web
 * useWindowDimensions returning incorrect values on initial render.
 */
export function useResponsive(): ResponsiveState {
  const [dimensions, setDimensions] = useState(getWindowDimensions);

  useEffect(() => {
    const handleResize = () => {
      setDimensions(getWindowDimensions());
    };
    // Sync on mount in case SSR fallback was used
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { width, height } = dimensions;

  const getColumns = useCallback((options?: ColumnOptions): number => {
    const bp = getBreakpoint(width);
    const columnConfig = options || GRID_COLUMNS;

    if (bp === '2xl' && columnConfig['2xl']) return columnConfig['2xl'];
    if (bp === 'xl' && columnConfig.xl) return columnConfig.xl;
    if (bp === 'lg' && columnConfig.lg) return columnConfig.lg;
    if (bp === 'md' && columnConfig.md) return columnConfig.md;
    if (bp === 'sm' && columnConfig.sm) return columnConfig.sm;
    if (columnConfig.xs) return columnConfig.xs;

    return GRID_COLUMNS[bp];
  }, [width]);

  const state = useMemo(() => {
    const isMobile = width < MOBILE_BREAKPOINT;
    const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
    const isDesktop = width >= TABLET_BREAKPOINT;

    return {
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      isPortrait: height > width,
      isLandscape: width >= height,
      breakpoint: getBreakpoint(width),
      getColumns,
    };
  }, [width, height, getColumns]);

  return state;
}
