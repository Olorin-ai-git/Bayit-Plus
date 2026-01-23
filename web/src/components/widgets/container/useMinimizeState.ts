/**
 * useMinimizeState - Widget minimize/restore state management
 *
 * Manages minimized state, saves position before minimizing,
 * and restores position when un-minimizing.
 */

import { useState, useCallback } from 'react';
import type { WidgetPosition } from '@/types/widget';

interface UseMinimizeStateProps {
  position: WidgetPosition;
  onPositionChange: (position: Partial<WidgetPosition>) => void;
  minimizedWidth?: number;
  minimizedHeight?: number;
}

export function useMinimizeState({
  position,
  onPositionChange,
  minimizedWidth = 200,
  minimizedHeight = 40,
}: UseMinimizeStateProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [savedPosition, setSavedPosition] = useState<{ x: number; y: number } | null>(null);

  const handleMinimize = useCallback(() => {
    setSavedPosition({ x: position.x, y: position.y });
    setIsMinimized(true);
  }, [position.x, position.y]);

  const handleRestore = useCallback(() => {
    setIsMinimized(false);
    if (savedPosition) {
      onPositionChange({ x: savedPosition.x, y: savedPosition.y });
      setTimeout(() => setSavedPosition(null), 350);
    }
  }, [savedPosition, onPositionChange]);

  const getMinimizedPosition = useCallback((isRTL: boolean, minimizedIndex: number = 0) => {
    const minimizedX = isRTL
      ? window.innerWidth - minimizedWidth - 20 - (minimizedIndex * (minimizedWidth + 10))
      : 20 + (minimizedIndex * (minimizedWidth + 10));
    const minimizedY = window.innerHeight - minimizedHeight - 20;

    return { x: minimizedX, y: minimizedY };
  }, [minimizedWidth, minimizedHeight]);

  return {
    isMinimized,
    savedPosition,
    minimizedWidth,
    minimizedHeight,
    handleMinimize,
    handleRestore,
    getMinimizedPosition,
  };
}
