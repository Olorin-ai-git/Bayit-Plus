/**
 * GlassReorderableList Component
 *
 * A reorderable list with glassmorphism styling.
 * Supports drag-and-drop on web and arrow buttons on all platforms.
 * Designed for accessibility with keyboard navigation and TV remote support.
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, Platform, LayoutChangeEvent, ViewStyle, StyleProp } from 'react-native';
import { spacing } from '../../theme';

export interface GlassReorderableListProps<T> {
  /** Items to display in the list */
  items: T[];
  /** Callback when items are reordered */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Render function for each item */
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  /** Key extractor for items */
  keyExtractor: (item: T) => string;
  /** Optional style for the container */
  style?: StyleProp<ViewStyle>;
  /** Enable drag-and-drop (web only, defaults to true) */
  enableDragDrop?: boolean;
  /** Test ID for testing */
  testID?: string;
}

interface DragState {
  isDragging: boolean;
  dragIndex: number;
  dragY: number;
  startY: number;
  itemHeights: number[];
}

/**
 * Glassmorphic reorderable list component
 */
export function GlassReorderableList<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  style,
  enableDragDrop = true,
  testID,
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
  const calculateTargetIndex = useCallback(
    (currentY: number, _startIndex: number): number => {
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
    },
    [items, keyExtractor]
  );

  // Web-only drag handlers
  const handleDragStart = useCallback(
    (index: number, clientY: number) => {
      if (Platform.OS !== 'web' || !enableDragDrop) return;

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
    },
    [items, keyExtractor, enableDragDrop]
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!dragState.isDragging) return;

      setDragState((prev) => ({
        ...prev,
        dragY: clientY - prev.startY,
      }));
    },
    [dragState.isDragging]
  );

  const handleDragEnd = useCallback(
    (clientY: number) => {
      if (!dragState.isDragging) return;

      // Calculate where to drop
      const containerRect = (containerRef.current as unknown as HTMLElement)?.getBoundingClientRect?.();
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
    },
    [dragState, calculateTargetIndex, onReorder]
  );

  // Set up global mouse event listeners for web drag
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
    <View ref={containerRef} style={[{ gap: spacing.sm }, style]} testID={testID}>
      {items.map((item, index) => {
        const key = keyExtractor(item);
        const isDragging = dragState.isDragging && dragState.dragIndex === index;

        const itemStyle: ViewStyle = {
          zIndex: isDragging ? 100 : 1,
          opacity: isDragging ? 0.9 : 1,
        };

        if (isDragging) {
          itemStyle.transform = [{ translateY: dragState.dragY }];
        }

        const webDragProps =
          Platform.OS === 'web' && enableDragDrop
            ? {
                onMouseDown: (e: React.MouseEvent) => {
                  // Only start drag if target is a drag handle
                  const target = e.target as HTMLElement;
                  if (target.closest('[data-drag-handle="true"]')) {
                    e.preventDefault();
                    handleDragStart(index, e.clientY);
                  }
                },
              }
            : {};

        return (
          <View
            key={key}
            className="relative"
            style={itemStyle}
            onLayout={(e) => handleItemLayout(key, e)}
            {...webDragProps}
          >
            {renderItem(item, index, isDragging)}
          </View>
        );
      })}
    </View>
  );
}

export default GlassReorderableList;
