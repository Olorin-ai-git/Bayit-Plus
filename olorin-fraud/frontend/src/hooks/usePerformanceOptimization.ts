/**
 * Performance Optimization Hooks for React Components
 * 
 * Provides optimized hooks for common React patterns with built-in
 * performance optimizations, memoization, and monitoring.
 */

import { 
  useCallback, 
  useMemo, 
  useRef, 
  useEffect, 
  useState,
  DependencyList,
  RefObject
} from 'react';

// Performance monitoring interface
interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  mountTime: number;
  updateCount: number;
}

interface IntersectionOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

/**
 * Enhanced useCallback with performance monitoring
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList,
  debugName?: string
): T {
  const callCount = useRef(0);
  const lastCallTime = useRef(0);
  
  return useCallback(
    ((...args: Parameters<T>) => {
      const start = performance.now();
      callCount.current++;
      
      try {
        const result = callback(...args);
        
        const duration = performance.now() - start;
        lastCallTime.current = duration;
        
        if (debugName && duration > 5) {
          console.debug(
            `Slow callback execution: ${debugName} took ${duration.toFixed(2)}ms`
          );
        }
        
        return result;
      } catch (error) {
        console.error(`Callback error in ${debugName}:`, error);
        throw error;
      }
    }) as T,
    deps
  );
}

/**
 * Enhanced useMemo with performance monitoring
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: DependencyList,
  debugName?: string
): T {
  const computeCount = useRef(0);
  const lastComputeTime = useRef(0);
  
  return useMemo(() => {
    const start = performance.now();
    computeCount.current++;
    
    try {
      const result = factory();
      
      const duration = performance.now() - start;
      lastComputeTime.current = duration;
      
      if (debugName && duration > 10) {
        console.debug(
          `Expensive memo computation: ${debugName} took ${duration.toFixed(2)}ms`
        );
      }
      
      return result;
    } catch (error) {
      console.error(`Memo computation error in ${debugName}:`, error);
      throw error;
    }
  }, deps);
}

/**
 * Hook for tracking component render performance
 */
export function useRenderPerformance(
  componentName: string,
  enableLogging = process.env.NODE_ENV === 'development'
): PerformanceMetrics {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    mountTime: performance.now(),
    updateCount: 0
  });
  
  const renderStartTime = useRef(performance.now());
  
  useEffect(() => {
    const renderEndTime = performance.now();
    const renderDuration = renderEndTime - renderStartTime.current;
    
    const metrics = metricsRef.current;
    metrics.renderCount++;
    metrics.lastRenderTime = renderDuration;
    metrics.averageRenderTime = 
      (metrics.averageRenderTime * (metrics.renderCount - 1) + renderDuration) / 
      metrics.renderCount;
    
    if (metrics.renderCount > 1) {
      metrics.updateCount++;
    }
    
    if (enableLogging && renderDuration > 16) { // Slower than 60fps
      console.warn(
        `Slow render: ${componentName} took ${renderDuration.toFixed(2)}ms ` +
        `(render #${metrics.renderCount})`
      );
    }
    
    renderStartTime.current = performance.now();
  });
  
  return metricsRef.current;
}

/**
 * Optimized intersection observer hook
 */
export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  options: IntersectionOptions = {},
  enabled = true
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggeredRef = useRef(false);
  
  const {
    threshold = 0,
    rootMargin = '0px',
    triggerOnce = false
  } = options;
  
  const cleanup = useOptimizedCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, [], 'intersection-cleanup');
  
  useEffect(() => {
    if (!enabled || !elementRef.current || (triggerOnce && triggeredRef.current)) {
      return;
    }
    
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported');
      setIsIntersecting(true);
      return;
    }
    
    cleanup();
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry?.isIntersecting ?? false;
        setIsIntersecting(isVisible);
        
        if (isVisible && triggerOnce) {
          triggeredRef.current = true;
        }
      },
      { threshold, rootMargin }
    );
    
    observerRef.current.observe(elementRef.current);
    
    return cleanup;
  }, [elementRef, threshold, rootMargin, triggerOnce, enabled, cleanup]);
  
  return isIntersecting;
}

/**
 * Optimized debounce hook
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: DebounceOptions = {}
): T {
  const {
    leading = false,
    trailing = true,
    maxWait
  } = options;
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastCallTimeRef = useRef<number>();
  const lastInvokeTimeRef = useRef(0);
  const leadingInvokedRef = useRef(false);
  
  const invokeCallback = useOptimizedCallback(
    (...args: Parameters<T>) => {
      lastInvokeTimeRef.current = Date.now();
      return callback(...args);
    },
    [callback],
    'debounce-invoke'
  );
  
  const cancelDelayedInvoke = useOptimizedCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
    }
  }, [], 'debounce-cancel');
  
  const debouncedCallback = useOptimizedCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      lastCallTimeRef.current = now;
      
      const shouldInvokeLeading = leading && !timeoutRef.current;
      
      if (shouldInvokeLeading) {
        leadingInvokedRef.current = true;
        return invokeCallback(...args);
      }
      
      cancelDelayedInvoke();
      
      const invokeTrailing = () => {
        if (trailing && lastCallTimeRef.current === now) {
          return invokeCallback(...args);
        }
      };
      
      timeoutRef.current = setTimeout(invokeTrailing, delay);
      
      // Handle maxWait
      if (maxWait && !maxTimeoutRef.current) {
        const maxWaitHandler = () => {
          cancelDelayedInvoke();
          if (lastCallTimeRef.current === now) {
            return invokeCallback(...args);
          }
        };
        
        maxTimeoutRef.current = setTimeout(maxWaitHandler, maxWait);
      }
    }) as T,
    [callback, delay, leading, trailing, maxWait, invokeCallback, cancelDelayedInvoke],
    'debounced-callback'
  );
  
  useEffect(() => {
    return cancelDelayedInvoke;
  }, [cancelDelayedInvoke]);
  
  return debouncedCallback;
}

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useOptimizedMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan], 'virtual-scroll-range');
  
  const visibleItems = useOptimizedMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (visibleRange.startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }));
  }, [items, visibleRange, itemHeight], 'virtual-scroll-items');
  
  const totalHeight = items.length * itemHeight;
  
  const handleScroll = useOptimizedCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, [], 'virtual-scroll-handler');
  
  return {
    visibleItems,
    totalHeight,
    handleScroll,
    containerProps: {
      style: {
        height: containerHeight,
        overflow: 'auto' as const,
        position: 'relative' as const
      },
      onScroll: handleScroll
    }
  };
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(
  src: string,
  placeholder?: string
): {
  imgRef: RefObject<HTMLImageElement>;
  imgSrc: string;
  isLoading: boolean;
  isError: boolean;
} {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSrc, setImgSrc] = useState(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  const isIntersecting = useIntersectionObserver(imgRef, {
    triggerOnce: true,
    threshold: 0.1
  });
  
  useEffect(() => {
    if (!isIntersecting || !src) return;
    
    setIsLoading(true);
    setIsError(false);
    
    const image = new Image();
    
    image.onload = () => {
      setImgSrc(src);
      setIsLoading(false);
    };
    
    image.onerror = () => {
      setIsError(true);
      setIsLoading(false);
    };
    
    image.src = src;
    
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [isIntersecting, src]);
  
  return {
    imgRef,
    imgSrc,
    isLoading: isIntersecting ? isLoading : false,
    isError
  };
}

/**
 * Performance context provider hook
 */
export function usePerformanceContext() {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    totalRenderTime: 0,
    slowRenders: 0,
    memoryUsage: 0
  });
  
  const updateMetrics = useOptimizedCallback((componentMetrics: PerformanceMetrics) => {
    setMetrics(prev => ({
      renderCount: prev.renderCount + 1,
      totalRenderTime: prev.totalRenderTime + componentMetrics.lastRenderTime,
      slowRenders: prev.slowRenders + (componentMetrics.lastRenderTime > 16 ? 1 : 0),
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
    }));
  }, [], 'update-performance-metrics');
  
  const getPerformanceSummary = useOptimizedCallback(() => ({
    ...metrics,
    averageRenderTime: metrics.renderCount > 0 
      ? metrics.totalRenderTime / metrics.renderCount 
      : 0,
    slowRenderRate: metrics.renderCount > 0 
      ? (metrics.slowRenders / metrics.renderCount) * 100 
      : 0
  }), [metrics], 'performance-summary');
  
  return {
    metrics,
    updateMetrics,
    getPerformanceSummary
  };
}