/**
 * GlassReorderableList - A reorderable list with glassmorphism styling
 * Supports drag-and-drop on web and arrow buttons on all platforms
 * Designed for accessibility with keyboard navigation and TV remote support
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Platform,
  LayoutChangeEvent,
  StyleSheet,
} from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';

interface GlassReorderableListProps<T> {
  /** Items to display in the list */
  items: T[];
  /** Callback when items are reordered */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Render function for each item */
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  /** Key extractor for items */
  keyExtractor: (item: T) => string;
  /** Optional style for the container */
  style?: any;
  /** Enable drag-and-drop (web only, defaults to true) */
  enableDragDrop?: boolean;
}

interface DragState {
  isDragging: boolean;
  dragIndex: number;
  dragY: number;
  startY: number;
  itemHeights: number[];
}

export function GlassReorderableList<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  style,
  enableDragDrop = true,
}: GlassReorderableListProps<T>) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: -1,
    dragY: 0,
    startY: 0,
    itemHeights: [],
  });

  const containerRef = useRef<View>(null);
  const itemRefs = useRef<Map<string, { height: number; top: number }>>(new Map());

  // Handle item layout to track heights
  const handleItemLayout = useCallback((key: string, event: LayoutChangeEvent) => {
    const { height, y } = event.nativeEvent.layout;
    itemRefs.current.set(key, { height, top: y });
  }, []);

  // Calculate target index based on drag position
  const calculateTargetIndex = useCallback((currentY: number, startIndex: number): number => {
    const heights = items.map((item) => {
      const ref = itemRefs.current.get(keyExtractor(item));
      return ref?.height || 60; // Default height
    });

    let accumulatedHeight = 0;
    for (let i = 0; i < items.length; i++) {
      const midPoint = accumulatedHeight + heights[i] / 2;
      if (currentY < midPoint) {
        return i;
      }
      accumulatedHeight += heights[i] + spacing.sm; // Include gap
    }
    return items.length - 1;
  }, [items, keyExtractor]);

  // Web-only drag handlers
  const handleDragStart = useCallback((index: number, clientY: number) => {
    const heights = items.map((item) => {
      const ref = itemRefs.current.get(keyExtractor(item));
      return ref?.height || 60;
    });

    setDragState({
      isDragging: true,
      dragIndex: index,
      dragY: 0,
      startY: clientY,
      itemHeights: heights,
    });
  }, [items, keyExtractor]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragState.isDragging) return;

    setDragState((prev) => ({
      ...prev,
      dragY: clientY - prev.startY,
    }));
  }, [dragState.isDragging]);

  const handleDragEnd = useCallback((clientY: number) => {
    if (!dragState.isDragging) return;

    // Calculate where to drop
    const containerRect = (containerRef.current as any)?.getBoundingClientRect?.();
    if (containerRect) {
      const relativeY = clientY - containerRect.top;
      const targetIndex = calculateTargetIndex(relativeY, dragState.dragIndex);

      if (targetIndex !== dragState.dragIndex) {
        onReorder(dragState.dragIndex, targetIndex);
      }
    }

    setDragState({
      isDragging: false,
      dragIndex: -1,
      dragY: 0,
      startY: 0,
      itemHeights: [],
    });
  }, [dragState, calculateTargetIndex, onReorder]);

  // Native mousedown listener on container - bypasses Pressable's responder system
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !enableDragDrop) return;

    const el = containerRef.current as unknown as HTMLElement;
    if (!el?.addEventListener) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // testID renders as data-testid in RN Web
      if (!target.closest('[data-testid="drag-handle"]')) return;

      // Walk up to find which direct child of the container was clicked
      let node: HTMLElement | null = target;
      while (node && node.parentElement !== el) {
        node = node.parentElement;
      }
      if (!node) return;

      const idx = Array.from(el.children).indexOf(node);
      if (idx < 0 || idx >= items.length) return;

      e.preventDefault();
      e.stopPropagation();
      handleDragStart(idx, e.clientY);
    };

    el.addEventListener('mousedown', onMouseDown, true);
    return () => el.removeEventListener('mousedown', onMouseDown, true);
  }, [enableDragDrop, handleDragStart, items.length]);

  // Set up global mouse event listeners for web drag move/end
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleDragMove(e.clientY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      handleDragEnd(e.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  return (
    <View ref={containerRef} style={[styles.container, style]}>
      {items.map((item, index) => {
        const key = keyExtractor(item);
        const isDragging = dragState.isDragging && dragState.dragIndex === index;

        const itemStyle: any = {
          zIndex: isDragging ? 100 : 1,
          opacity: isDragging ? 0.9 : 1,
        };

        if (isDragging) {
          itemStyle.transform = [{ translateY: dragState.dragY }];
        }

        return (
          <View
            key={key}
            style={[styles.item, itemStyle]}
            onLayout={(e) => handleItemLayout(key, e)}
          >
            {renderItem(item, index, isDragging)}
          </View>
        );
      })}
    </View>
  );
}

// Styles using StyleSheet.create() - React Native Web compatible
const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  item: {
    position: 'relative',
  },
});

export default GlassReorderableList;
