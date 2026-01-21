/**
 * Performance Optimization Utilities
 *
 * Centralized exports for all performance optimization tools:
 * - Image optimization
 * - List rendering optimization
 * - Bundle size analysis
 * - Code-splitting helpers
 */

import React from 'react';
import { Platform, View, Text, ActivityIndicator } from 'react-native';

// Re-export list optimization utilities
export * from './listOptimization';

// Re-export OptimizedImage component (for convenience)
export { OptimizedImage } from '../components/OptimizedImage';

/**
 * Code-splitting utilities for React.lazy
 *
 * Use these helpers to lazy-load heavy components and reduce initial bundle size
 */

/**
 * Create a lazy-loaded component with loading fallback
 *
 * @example
 * ```tsx
 * const AdminDashboard = createLazyComponent(
 *   () => import('../screens/admin/Dashboard'),
 *   'Loading admin dashboard...'
 * );
 * ```
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  loadingMessage = 'Loading...'
) {
  const LazyComponent = React.lazy(importFn);

  return (props: React.ComponentProps<T>) => (
    <React.Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#a855f7" />
          <Text style={{ color: '#fff', marginTop: 16 }}>{loadingMessage}</Text>
        </View>
      }
    >
      <LazyComponent {...props} />
    </React.Suspense>
  );
}

/**
 * Preload a lazy component
 *
 * Use to prefetch components before user navigates to them
 *
 * @example
 * ```tsx
 * const AdminDashboard = lazy(() => import('../screens/admin/Dashboard'));
 *
 * // Preload on hover or focus
 * <Link to="/admin" onMouseEnter={() => preloadComponent(() => import('../screens/admin/Dashboard'))}>
 *   Admin
 * </Link>
 * ```
 */
export function preloadComponent(importFn: () => Promise<any>) {
  importFn().catch((error) => {
    console.warn('[Performance] Failed to preload component:', error);
  });
}

/**
 * Platform-specific imports
 *
 * Load different implementations based on platform
 *
 * @example
 * ```tsx
 * const VideoPlayer = platformImport({
 *   web: () => import('./VideoPlayerWeb'),
 *   native: () => import('./VideoPlayerNative'),
 * });
 * ```
 */
export function platformImport<T>(imports: {
  web?: () => Promise<{ default: T }>;
  native?: () => Promise<{ default: T }>;
  ios?: () => Promise<{ default: T }>;
  android?: () => Promise<{ default: T }>;
  default: () => Promise<{ default: T }>;
}) {
  // Platform detection
  const isWeb = typeof window !== 'undefined' && !('ReactNativeWebView' in window);
  const isIOS = !isWeb && Platform.OS === 'ios';
  const isAndroid = !isWeb && Platform.OS === 'android';

  // Select appropriate import
  if (isWeb && imports.web) {
    return React.lazy(imports.web);
  } else if (isIOS && imports.ios) {
    return React.lazy(imports.ios);
  } else if (isAndroid && imports.android) {
    return React.lazy(imports.android);
  } else if (!isWeb && imports.native) {
    return React.lazy(imports.native);
  } else {
    return React.lazy(imports.default);
  }
}

/**
 * Route-based code splitting
 *
 * Automatically lazy-load routes for web apps
 *
 * @example
 * ```tsx
 * const routes = createLazyRoutes({
 *   '/': () => import('../screens/HomeScreen'),
 *   '/vod': () => import('../screens/VODScreen'),
 *   '/admin/*': () => import('../screens/admin/AdminRouter'),
 * });
 * ```
 */
export function createLazyRoutes(routeImports: Record<string, () => Promise<any>>) {
  return Object.entries(routeImports).map(([path, importFn]) => ({
    path,
    component: React.lazy(importFn),
  }));
}

/**
 * Performance monitoring hook
 *
 * Track component render performance in development
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useRenderPerformance('MyComponent');
 *   return <View>...</View>;
 * }
 * ```
 */
export function useRenderPerformance(componentName: string) {
  React.useEffect(() => {
    if (__DEV__) {
      const startTime = performance.now();
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        if (renderTime > 16) {
          // Slower than 60fps
          console.warn(
            `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (>16ms threshold)`
          );
        }
      };
    }
  });
}

/**
 * Memoization utilities
 */

/**
 * Create a memoized component with custom comparison
 *
 * @example
 * ```tsx
 * const MemoizedCard = createMemoComponent(
 *   ContentCard,
 *   (prev, next) => prev.item.id === next.item.id
 * );
 * ```
 */
export function createMemoComponent<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
) {
  return React.memo(Component, areEqual);
}

/**
 * Performance best practices checklist
 *
 * Use this as a guide when optimizing components
 */
export const performanceBestPractices = {
  images: [
    'Use OptimizedImage for all remote images',
    'Enable lazy loading for offscreen images',
    'Use appropriate image sizes (web: 300x450, tv: 600x900)',
    'Implement image caching with LRU cache',
  ],
  lists: [
    'Use FlatList optimization props (windowSize, maxToRenderPerBatch)',
    'Implement getItemLayout for consistent item heights',
    'Use removeClippedSubviews on native platforms',
    'Memoize renderItem components',
    'Use unique, stable keys',
  ],
  bundleSize: [
    'Use React.lazy for route-based code splitting',
    'Avoid importing entire libraries (use named imports)',
    'Remove unused dependencies',
    'Use lighter alternatives (date-fns vs moment)',
    'Tree-shake unused code',
  ],
  rendering: [
    'Use React.memo for expensive components',
    'Avoid inline functions in render',
    'Use useCallback and useMemo appropriately',
    'Keep component files <200 lines',
    'Monitor render performance with useRenderPerformance',
  ],
};
