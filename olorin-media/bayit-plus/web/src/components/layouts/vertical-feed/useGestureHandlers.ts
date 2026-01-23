/**
 * Gesture Handlers Hook
 * Touch, wheel, and keyboard navigation handlers
 */

import { useState, useEffect, useCallback } from 'react';

interface UseGestureHandlersProps {
  currentIndex: number;
  isTransitioning: boolean;
  itemsLength: number;
  onNext: () => void;
  onPrevious: () => void;
  onItemPress: () => void;
}

export function useGestureHandlers({
  currentIndex,
  isTransitioning,
  itemsLength,
  onNext,
  onPrevious,
  onItemPress,
}: UseGestureHandlersProps) {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: any) => {
    const touch = e.nativeEvent?.touches?.[0] || e.touches?.[0];
    if (touch) {
      setTouchStart(touch.clientY);
      setTouchEnd(touch.clientY);
    }
  };

  const handleTouchMove = (e: any) => {
    const touch = e.nativeEvent?.touches?.[0] || e.touches?.[0];
    if (touch) {
      setTouchEnd(touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        onNext();
      } else {
        onPrevious();
      }
    }
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    if (isTransitioning) return;

    if (e.deltaY > 0) {
      onNext();
    } else if (e.deltaY < 0) {
      onPrevious();
    }
  }, [isTransitioning, onNext, onPrevious]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        onNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        onPrevious();
      } else if (e.key === 'Enter' || e.key === ' ') {
        onItemPress();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onItemPress]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
  };
}
