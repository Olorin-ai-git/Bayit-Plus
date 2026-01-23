/**
 * useDragBehavior - Drag behavior hook for widget repositioning
 *
 * Handles mouse-based dragging with boundary constraints.
 */

import { useState, useCallback, useEffect } from 'react';
import type { WidgetPosition } from '@/types/widget';

interface UseDragBehaviorProps {
  isDraggable: boolean;
  position: WidgetPosition;
  onPositionChange: (position: Partial<WidgetPosition>) => void;
}

export function useDragBehavior({
  isDraggable,
  position,
  onPositionChange,
}: UseDragBehaviorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragStart = useCallback((e: React.MouseEvent, containerRef: HTMLDivElement | null) => {
    if (!isDraggable || !containerRef) return;

    const rect = containerRef.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    e.preventDefault();
  }, [isDraggable]);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const maxX = window.innerWidth - position.width;
    const maxY = window.innerHeight - position.height;

    const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, maxX));
    const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, maxY));

    onPositionChange({ x: newX, y: newY });
  }, [isDragging, dragOffset, position.width, position.height, onPositionChange]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  return {
    isDragging,
    handleDragStart,
  };
}
