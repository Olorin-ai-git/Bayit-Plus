/**
 * Keyboard Shortcuts Utilities
 */

export const registerKeyboardShortcut = (
  key: string,
  callback: () => void,
  ctrlKey: boolean = false,
  shiftKey: boolean = false,
  altKey: boolean = false
): (() => void) => {
  const handler = (event: KeyboardEvent) => {
    if (
      event.key === key &&
      event.ctrlKey === ctrlKey &&
      event.shiftKey === shiftKey &&
      event.altKey === altKey
    ) {
      event.preventDefault();
      callback();
    }
  };

  document.addEventListener('keydown', handler);

  return () => {
    document.removeEventListener('keydown', handler);
  };
};

export const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  const unsubscribers: (() => void)[] = [];

  Object.entries(shortcuts).forEach(([key, callback]) => {
    const unsubscribe = registerKeyboardShortcut(key, callback);
    unsubscribers.push(unsubscribe);
  });

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
};
