/**
 * Keyboard Shortcuts Utility
 * Handles keyboard shortcuts for investigations management
 */

import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  onSearchFocus?: () => void;
  onNewInvestigation?: () => void;
  onCloseModal?: () => void;
}

export const useKeyboardShortcuts = (handlers: KeyboardShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // '/' - Focus search
      if (e.key === '/' && handlers.onSearchFocus) {
        e.preventDefault();
        handlers.onSearchFocus();
      }

      // 'N' or 'n' - New investigation
      if ((e.key === 'N' || e.key === 'n') && handlers.onNewInvestigation) {
        e.preventDefault();
        handlers.onNewInvestigation();
      }

      // 'Escape' - Close modal/drawer
      if (e.key === 'Escape' && handlers.onCloseModal) {
        handlers.onCloseModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
};

