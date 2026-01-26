/**
 * useMultiWindowFocus - TV focus navigation hook
 *
 * Custom hook for tvOS remote control focus management:
 * - Track focus state for window
 * - Listen for TV remote events (arrow keys, select button)
 * - Navigate focus between windows
 * - Handle select button (expand/collapse window)
 */

import { useEffect, useRef } from 'react';
import { TVEventHandler, useTVEventHandler } from 'react-native';
import { useMultiWindowStore } from '../../stores/multiWindowStore';
import type { FocusDirection } from '../../stores/multiWindowStore';

interface UseMultiWindowFocusOptions {
  windowId: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSelect?: () => void; // Remote click/select button
}

interface UseMultiWindowFocusReturn {
  isFocused: boolean;
  focusableProps: {
    hasTVPreferredFocus?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
  };
}

export function useMultiWindowFocus(
  options: UseMultiWindowFocusOptions
): UseMultiWindowFocusReturn {
  const { windowId, onFocus, onBlur, onSelect } = options;

  const focusedWindowId = useMultiWindowStore((state) => state.focusedWindowId);
  const setFocusedWindow = useMultiWindowStore((state) => state.setFocusedWindow);
  const navigateFocus = useMultiWindowStore((state) => state.navigateFocus);

  const isFocused = focusedWindowId === windowId;
  const tvEventHandlerRef = useRef<TVEventHandler | null>(null);

  // Handle TV remote events
  useEffect(() => {
    if (!isFocused) return;

    // Create TV event handler for this window when focused
    const handler = new TVEventHandler();
    tvEventHandlerRef.current = handler;

    handler.enable(null, (cmp: any, evt: any) => {
      const { eventType } = evt;

      switch (eventType) {
        case 'up':
          navigateFocus('up');
          break;
        case 'down':
          navigateFocus('down');
          break;
        case 'left':
          navigateFocus('left');
          break;
        case 'right':
          navigateFocus('right');
          break;
        case 'select':
        case 'playPause':
          // Select button triggers window action (expand/collapse)
          if (onSelect) {
            onSelect();
          }
          break;
        default:
          break;
      }
    });

    return () => {
      if (tvEventHandlerRef.current) {
        tvEventHandlerRef.current.disable();
        tvEventHandlerRef.current = null;
      }
    };
  }, [isFocused, navigateFocus, onSelect]);

  // Track focus changes
  useEffect(() => {
    if (isFocused && onFocus) {
      onFocus();
    } else if (!isFocused && onBlur) {
      onBlur();
    }
  }, [isFocused, onFocus, onBlur]);

  // Focusable props to spread on component
  const focusableProps = {
    hasTVPreferredFocus: isFocused,
    onFocus: () => {
      setFocusedWindow(windowId);
      if (onFocus) onFocus();
    },
    onBlur: () => {
      if (onBlur) onBlur();
    },
  };

  return {
    isFocused,
    focusableProps,
  };
}

export default useMultiWindowFocus;
