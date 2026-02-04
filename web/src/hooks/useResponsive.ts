/**
 * useResponsive Hook
 *
 * Provides responsive utilities for adapting UI to different screen sizes.
 * Handles mobile, tablet, and desktop breakpoints with grid column calculations.
 */

import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';
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
 * Hook that provides responsive state and utilities
 */
export function useResponsive(): ResponsiveState {
  const { width, height } = useWindowDimensions();

  const state = useMemo(() => {
    const isMobile = width < MOBILE_BREAKPOINT;
    const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
    const isDesktop = width >= TABLET_BREAKPOINT;
    const isPortrait = height > width;
    const isLandscape = width >= height;
    const breakpoint = getBreakpoint(width);

    const getColumns = (options?: ColumnOptions): number => {
      const columnConfig = options || GRID_COLUMNS;

      // Find the appropriate column count for current breakpoint
      if (breakpoint === '2xl' && columnConfig['2xl']) {
        return columnConfig['2xl'];
      }
      if (breakpoint === 'xl' && columnConfig.xl) {
        return columnConfig.xl;
      }
      if (breakpoint === 'lg' && columnConfig.lg) {
        return columnConfig.lg;
      }
      if (breakpoint === 'md' && columnConfig.md) {
        return columnConfig.md;
      }
      if (breakpoint === 'sm' && columnConfig.sm) {
        return columnConfig.sm;
      }
      if (columnConfig.xs) {
        return columnConfig.xs;
      }

      // Fallback to default grid columns
      return GRID_COLUMNS[breakpoint];
    };

    return {
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      isPortrait,
      isLandscape,
      breakpoint,
      getColumns,
    };
  }, [width, height]);

  return state;
}
