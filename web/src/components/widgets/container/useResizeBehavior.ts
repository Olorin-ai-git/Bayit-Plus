/**
 * useResizeBehavior - Resize behavior hook for widget size adjustment
 *
 * Handles 8-directional resizing (4 edges + 4 corners) with minimum size constraints.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { WidgetPosition } from '@/types/widget';

interface UseResizeBehaviorProps {
  position: WidgetPosition;
  onPositionChange: (position: Partial<WidgetPosition>) => void;
  minWidth?: number;
  minHeight?: number;
}

export function useResizeBehavior({
  position,
  onPositionChange,
  minWidth = 200,
  minHeight = 150,
}: UseResizeBehaviorProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: position.width,
      height: position.height,
    };
  }, [position.width, position.height]);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeStartRef.current || !resizeDirection) return;

    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    const updates: Partial<WidgetPosition> = {};

    // Horizontal resize
    if (resizeDirection.includes('e')) {
      updates.width = Math.max(minWidth, resizeStartRef.current.width + deltaX);
    } else if (resizeDirection.includes('w')) {
      const newWidth = Math.max(minWidth, resizeStartRef.current.width - deltaX);
      if (newWidth !== resizeStartRef.current.width) {
        updates.width = newWidth;
        updates.x = position.x + (resizeStartRef.current.width - newWidth);
      }
    }

    // Vertical resize
    if (resizeDirection.includes('s')) {
      updates.height = Math.max(minHeight, resizeStartRef.current.height + deltaY);
    } else if (resizeDirection.includes('n')) {
      const newHeight = Math.max(minHeight, resizeStartRef.current.height - deltaY);
      if (newHeight !== resizeStartRef.current.height) {
        updates.height = newHeight;
        updates.y = position.y + (resizeStartRef.current.height - newHeight);
      }
    }

    if (Object.keys(updates).length > 0) {
      onPositionChange(updates);
    }
  }, [isResizing, resizeDirection, position.x, position.y, minWidth, minHeight, onPositionChange]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeDirection(null);
    resizeStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  return {
    isResizing,
    resizeDirection,
    handleResizeStart,
  };
}
