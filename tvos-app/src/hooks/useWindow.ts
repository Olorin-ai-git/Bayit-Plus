/**
 * useWindow Hook
 * Helper hook to get a single window with its merged state
 */

import { useMultiWindowStore } from '../stores/multiWindowStore';
import type { WindowPosition } from '../types/multiWindow';

export function useWindow(windowId: string) {
  const window = useMultiWindowStore((state) =>
    state.windows.find((w) => w.id === windowId)
  );
  const windowState = useMultiWindowStore((state) => state.getWindowState(windowId));
  const toggleMute = useMultiWindowStore((state) => state.toggleMute);
  const closeWindow = useMultiWindowStore((state) => state.closeWindow);
  const minimizeWindow = useMultiWindowStore((state) => state.minimizeWindow);
  const expandWindow = useMultiWindowStore((state) => state.expandWindow);
  const updatePosition = useMultiWindowStore((state) => state.updatePosition);
  const setFocusedWindow = useMultiWindowStore((state) => state.setFocusedWindow);
  const isFocused = useMultiWindowStore((state) => state.focusedWindowId === windowId);
  const isExpanded = useMultiWindowStore((state) => state.expandedWindowId === windowId);

  if (!window || !windowState) return null;

  return {
    window,
    ...windowState,
    isFocused,
    isExpanded,
    toggleMute: () => toggleMute(windowId),
    close: () => closeWindow(windowId),
    minimize: () => minimizeWindow(windowId),
    expand: () => expandWindow(windowId),
    updatePosition: (pos: Partial<WindowPosition>) => updatePosition(windowId, pos),
    setFocused: () => setFocusedWindow(windowId),
  };
}
