import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// Virtualization configuration
interface VirtualizationConfig {
  items: any[];
  enabled: boolean;
  maxItems: number;
  itemHeight: number;
  containerHeight?: number;
  overscan?: number;
  scrollThreshold?: number;
}

// Virtualized item interface
interface VirtualizedItem<T = any> {
  index: number;
  data: T;
  style: {
    position: 'absolute';
    top: number;
    left: number;
    right: number;
    height: number;
  };
}

// Hook return interface
interface UseVirtualizedListReturn<T = any> {
  virtualizedItems: VirtualizedItem<T>[];
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  containerHeight: number;
  itemHeight: number;
  totalHeight: number;
  visibleRange: { start: number; end: number };
  isVirtualized: boolean;
  setContainerRef: (element: HTMLElement | null) => void;
  scrollProgress: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
}

export const useVirtualizedList = <T = any>({
  items,
  enabled = true,
  maxItems = 50,
  itemHeight = 80,
  containerHeight = 400,
  overscan = 5,
  scrollThreshold = 10
}: VirtualizationConfig): UseVirtualizedListReturn<T> => {
  // State
  const [scrollTop, setScrollTop] = useState(0);
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(null);
  const [actualContainerHeight, setActualContainerHeight] = useState(containerHeight || 400);
  
  // Refs
  const scrollElementRef = useRef<HTMLElement>();
  
  // Determine if virtualization should be used
  const isVirtualized = enabled && items.length > scrollThreshold;
  
  // Calculate total height
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);
  
  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!isVirtualized) {
      return { start: 0, end: Math.min(items.length - 1, maxItems - 1) };
    }
    
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(actualContainerHeight / itemHeight);
    const end = Math.min(
      items.length - 1,
      start + visibleCount + overscan
    );
    
    return {
      start: Math.max(0, start - overscan),
      end
    };
  }, [scrollTop, itemHeight, actualContainerHeight, items.length, overscan, isVirtualized, maxItems]);
  
  // Generate virtualized items
  const virtualizedItems = useMemo(() => {
    const { start, end } = visibleRange;
    const virtualItems: VirtualizedItem<T>[] = [];
    
    for (let i = start; i <= end && i < items.length; i++) {
      virtualItems.push({
        index: i,
        data: items[i],
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight
        }
      });
    }
    
    return virtualItems;
  }, [items, visibleRange, itemHeight]);
  
  // Handle scroll
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    if (target) {
      setScrollTop(target.scrollTop);
    }
  }, []);
  
  // Update container height when element changes
  const updateContainerHeight = useCallback(() => {
    if (containerElement) {
      const rect = containerElement.getBoundingClientRect();
      setActualContainerHeight(rect.height || containerHeight || 400);
    }
  }, [containerElement, containerHeight]);
  
  // Set up scroll listener
  useEffect(() => {
    if (containerElement && isVirtualized) {
      containerElement.addEventListener('scroll', handleScroll, { passive: true });
      scrollElementRef.current = containerElement;
      
      // Initial height calculation
      updateContainerHeight();
      
      // Watch for resize
      const resizeObserver = new ResizeObserver(updateContainerHeight);
      resizeObserver.observe(containerElement);
      
      return () => {
        containerElement.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
      };
    }
  }, [containerElement, isVirtualized, handleScroll, updateContainerHeight]);
  
  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (scrollElementRef.current && index >= 0 && index < items.length) {
      const scrollTop = index * itemHeight;
      scrollElementRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, [items.length, itemHeight]);
  
  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, []);
  
  // Container ref callback
  const setContainerRef = useCallback((element: HTMLElement | null) => {
    setContainerElement(element);
  }, []);
  
  return {
    virtualizedItems: isVirtualized ? virtualizedItems : items.slice(0, maxItems).map((item, index) => ({
      index,
      data: item,
      style: {
        position: 'absolute' as const,
        top: index * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight
      }
    })),
    scrollToIndex,
    scrollToTop,
    containerHeight: actualContainerHeight,
    itemHeight,
    totalHeight: isVirtualized ? totalHeight : Math.min(items.length, maxItems) * itemHeight,
    visibleRange,
    isVirtualized,
    
    // Additional utilities
    setContainerRef,
    scrollProgress: totalHeight > 0 ? scrollTop / (totalHeight - actualContainerHeight) : 0,
    canScrollUp: scrollTop > 0,
    canScrollDown: scrollTop < totalHeight - actualContainerHeight
  };
};

// Helper hook for infinite scrolling
export const useInfiniteScroll = <T = any>(
  items: T[],
  loadMore: () => Promise<T[]>,
  hasMore: boolean,
  threshold = 200
) => {
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState<T[]>(items);
  
  // Load more items
  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const newItems = await loadMore();
      setAllItems(prev => [...prev, ...newItems]);
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, loadMore]);
  
  // Check if should load more based on scroll position
  const checkLoadMore = useCallback((scrollTop: number, containerHeight: number, totalHeight: number) => {
    const scrollBottom = scrollTop + containerHeight;
    const shouldLoad = totalHeight - scrollBottom < threshold;
    
    if (shouldLoad && !loading && hasMore) {
      handleLoadMore();
    }
  }, [threshold, loading, hasMore, handleLoadMore]);
  
  // Update items when props change
  useEffect(() => {
    setAllItems(items);
  }, [items]);
  
  return {
    items: allItems,
    loading,
    hasMore,
    loadMore: handleLoadMore,
    checkLoadMore
  };
};

// Helper hook for search highlighting in virtualized lists
export const useVirtualizedSearch = <T = any>(
  items: T[],
  searchQuery: string,
  searchFields: (keyof T)[],
  highlightClassName = 'search-highlight'
) => {
  // Highlight matching text
  const highlightText = useCallback((text: string, query: string): string => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, `<span class="${highlightClassName}">$1</span>`);
  }, [highlightClassName]);
  
  // Process items with highlighting
  const processedItems = useMemo(() => {
    if (!searchQuery) return items;
    
    return items.map(item => {
      const highlightedItem = { ...item } as any;
      
      searchFields.forEach(field => {
        const value = item[field];
        if (typeof value === 'string') {
          highlightedItem[`${String(field)}_highlighted`] = highlightText(value, searchQuery);
        }
      });
      
      return highlightedItem;
    });
  }, [items, searchQuery, searchFields, highlightText]);
  
  return {
    processedItems,
    highlightText
  };
};