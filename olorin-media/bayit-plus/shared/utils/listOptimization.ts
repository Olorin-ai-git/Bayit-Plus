/**
 * FlatList Optimization Utilities
 *
 * Provides optimized configurations for FlatList components to ensure
 * smooth 60fps scrolling performance even with large datasets.
 *
 * Based on React Native performance best practices:
 * - Window size optimization for memory management
 * - Batch rendering for smooth scrolling
 * - Clipped subviews removal for native performance
 * - Item layout caching for consistent heights
 */

import { Platform } from 'react-native';

/**
 * Optimized FlatList props for general content lists
 *
 * Use for lists with 100-1000 items, variable heights
 */
export const getOptimizedListProps = () => ({
  // Window size: Number of screens worth of items to render
  // Lower = less memory, higher = less blank space during fast scrolling
  windowSize: 5,

  // Maximum number of items to render per batch
  maxToRenderPerBatch: 10,

  // Update cells in batches for smoother scrolling
  updateCellsBatchingPeriod: 50,

  // Initial number of items to render (first screen)
  initialNumToRender: 10,

  // Remove offscreen views (native optimization)
  removeClippedSubviews: Platform.OS !== 'web',

  // Prevent scroll to top on data changes
  maintainVisibleContentPosition: Platform.OS === 'ios'
    ? {
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }
    : undefined,
});

/**
 * Optimized FlatList props for large lists (1000+ items)
 *
 * Use for: Search results, catalog browsing, infinite scroll
 */
export const getOptimizedLargeListProps = () => ({
  windowSize: 3, // Smaller window for memory efficiency
  maxToRenderPerBatch: 5,
  updateCellsBatchingPeriod: 100,
  initialNumToRender: 5,
  removeClippedSubviews: Platform.OS !== 'web',
  maintainVisibleContentPosition: Platform.OS === 'ios'
    ? {
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }
    : undefined,
});

/**
 * Optimized FlatList props for grid layouts (numColumns > 1)
 *
 * Use for: Content cards, thumbnails, photo galleries
 */
export const getOptimizedGridProps = (numColumns: number) => ({
  windowSize: 4,
  maxToRenderPerBatch: numColumns * 3, // Render 3 rows at a time
  updateCellsBatchingPeriod: 50,
  initialNumToRender: numColumns * 2, // Render 2 rows initially
  removeClippedSubviews: Platform.OS !== 'web',
});

/**
 * Optimized FlatList props for horizontal scrolling
 *
 * Use for: Carousels, category chips, horizontal content rows
 */
export const getOptimizedHorizontalProps = () => ({
  windowSize: 3,
  maxToRenderPerBatch: 5,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 5,
  removeClippedSubviews: false, // Disabled for horizontal lists
  showsHorizontalScrollIndicator: false,
});

/**
 * Create a getItemLayout function for lists with consistent item heights
 *
 * This significantly improves performance by allowing FlatList to skip
 * measuring items and calculate scroll positions instantly.
 *
 * @param itemHeight - Fixed height of each item in pixels
 * @param separatorHeight - Height of separator between items (default: 0)
 *
 * @example
 * ```tsx
 * const getItemLayout = createGetItemLayout(100); // 100px tall items
 * <FlatList
 *   data={items}
 *   getItemLayout={getItemLayout}
 *   {...getOptimizedListProps()}
 * />
 * ```
 */
export const createGetItemLayout = (itemHeight: number, separatorHeight = 0) => {
  return (_data: any, index: number) => ({
    length: itemHeight,
    offset: (itemHeight + separatorHeight) * index,
    index,
  });
};

/**
 * Create a getItemLayout function for grid layouts
 *
 * @param itemHeight - Fixed height of each grid item
 * @param numColumns - Number of columns in the grid
 * @param separatorHeight - Vertical spacing between rows (default: 0)
 */
export const createGridItemLayout = (
  itemHeight: number,
  numColumns: number,
  separatorHeight = 0
) => {
  return (_data: any, index: number) => {
    const rowIndex = Math.floor(index / numColumns);
    return {
      length: itemHeight,
      offset: (itemHeight + separatorHeight) * rowIndex,
      index,
    };
  };
};

/**
 * Optimization: Memoized keyExtractor for stable item keys
 *
 * Prevents unnecessary re-renders by providing stable keys
 */
export const createKeyExtractor = <T extends { id: string | number }>(
  prefix = 'item'
) => {
  return (item: T, index: number) => `${prefix}-${item.id || index}`;
};

/**
 * Throttle scroll events for performance
 *
 * Use with onScroll to prevent excessive re-renders during scrolling
 */
export const throttleScrollEvent = {
  scrollEventThrottle: 16, // ~60fps
};

/**
 * Platform-specific optimizations
 */
export const platformOptimizations = {
  // iOS-specific optimizations
  ios: {
    // Bouncing effect
    bounces: true,
    // Deceleration rate
    decelerationRate: 'fast' as const,
    // Scroll indicator insets
    scrollIndicatorInsets: { right: 1 },
  },

  // Android-specific optimizations
  android: {
    // Disable overscroll effect for performance
    overScrollMode: 'never' as const,
    // Nested scroll enabled
    nestedScrollEnabled: true,
  },

  // Web-specific optimizations
  web: {
    // Smooth scrolling
    // @ts-ignore - Web CSS
    scrollBehavior: 'smooth',
  },
};

/**
 * Complete optimization preset for common use cases
 */
export const listPresets = {
  /** Default optimized list (100-1000 items, variable heights) */
  default: getOptimizedListProps(),

  /** Large list (1000+ items) */
  large: getOptimizedLargeListProps(),

  /** Grid layout */
  grid: (numColumns: number) => getOptimizedGridProps(numColumns),

  /** Horizontal scrolling */
  horizontal: getOptimizedHorizontalProps(),
};

/**
 * Performance monitoring utilities
 */
export const performanceUtils = {
  /**
   * Log FlatList performance metrics (debug only)
   */
  logPerformance: (listName: string, itemCount: number) => {
    if (__DEV__) {
      console.log(`[FlatList Performance] ${listName}:`, {
        itemCount,
        estimatedMemory: `${((itemCount * 0.5) / 1024).toFixed(2)} MB`,
        recommendation:
          itemCount > 1000 ? 'Use large list preset' : 'Use default preset',
      });
    }
  },

  /**
   * Measure scroll performance
   */
  measureScrollPerformance: () => {
    let lastScrollTime = Date.now();
    let frameDrops = 0;

    return {
      onScroll: () => {
        const now = Date.now();
        const delta = now - lastScrollTime;

        // If frame took longer than 16.67ms (60fps), count as dropped frame
        if (delta > 16.67) {
          frameDrops++;
        }

        lastScrollTime = now;
      },
      getStats: () => ({
        frameDrops,
        fps: frameDrops > 0 ? Math.round(60 - frameDrops) : 60,
      }),
    };
  },
};
