/**
 * useTVRemoteControl - TV remote keyboard navigation hook
 *
 * Handles arrow keys for widget positioning, Enter/Space for mute toggle,
 * and 0/Escape for closing on TV platforms.
 */

import { useEffect } from 'react';
import type { WidgetPosition } from '@/types/widget';

interface UseTVRemoteControlProps {
  isTVBuild: boolean;
  isFocused: boolean;
  isDraggable: boolean;
  isClosable: boolean;
  position: WidgetPosition;
  onToggleMute: () => void;
  onClose: () => void;
  onPositionChange: (position: Partial<WidgetPosition>) => void;
  moveStep?: number;
}

export function useTVRemoteControl({
  isTVBuild,
  isFocused,
  isDraggable,
  isClosable,
  position,
  onToggleMute,
  onClose,
  onPositionChange,
  moveStep = 20,
}: UseTVRemoteControlProps) {
  useEffect(() => {
    if (!isTVBuild || !isFocused) return;

    const handleRemoteKey = (e: KeyboardEvent) => {
      // Arrow keys for moving widget
      if (isDraggable) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            onPositionChange({
              x: Math.max(0, position.x - moveStep)
            });
            break;
          case 'ArrowRight':
            e.preventDefault();
            onPositionChange({
              x: Math.min(window.innerWidth - position.width, position.x + moveStep)
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            onPositionChange({
              y: Math.max(0, position.y - moveStep)
            });
            break;
          case 'ArrowDown':
            e.preventDefault();
            onPositionChange({
              y: Math.min(window.innerHeight - position.height, position.y + moveStep)
            });
            break;
        }
      }

      // Enter/OK button to toggle mute
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggleMute();
      }

      // 0/Red button to close (Samsung TV remote)
      if (e.key === '0' || e.key === 'Escape') {
        e.preventDefault();
        if (isClosable) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleRemoteKey);
    return () => window.removeEventListener('keydown', handleRemoteKey);
  }, [
    isTVBuild,
    isFocused,
    isDraggable,
    isClosable,
    position,
    onToggleMute,
    onClose,
    onPositionChange,
    moveStep,
  ]);
}
