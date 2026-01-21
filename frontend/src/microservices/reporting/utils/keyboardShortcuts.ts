/**
 * Keyboard Shortcuts Utility
 * Handles global keyboard shortcuts for the reports microservice
 */

export type KeyboardShortcutHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyboardShortcutHandler;
  description?: string;
}

class KeyboardShortcutsManager {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private enabled: boolean = true;

  /**
   * Register a keyboard shortcut
   */
  register(config: ShortcutConfig): () => void {
    const id = this.generateId(config);
    this.shortcuts.set(id, config);

    // Return unregister function
    return () => {
      this.shortcuts.delete(id);
    };
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if a key combination matches a shortcut
   */
  private matches(event: KeyboardEvent, config: ShortcutConfig): boolean {
    if (event.key !== config.key) {
      return false;
    }

    if (config.ctrl && !event.ctrlKey) return false;
    if (config.meta && !event.metaKey) return false;
    if (config.shift && !event.shiftKey) return false;
    if (config.alt && !event.altKey) return false;

    // Ensure no extra modifiers are pressed
    if (config.ctrl && event.metaKey) return false;
    if (config.meta && event.ctrlKey) return false;

    return true;
  }

  /**
   * Generate unique ID for a shortcut
   */
  private generateId(config: ShortcutConfig): string {
    const modifiers = [
      config.ctrl ? 'ctrl' : '',
      config.meta ? 'meta' : '',
      config.shift ? 'shift' : '',
      config.alt ? 'alt' : '',
    ]
      .filter(Boolean)
      .join('+');

    return `${modifiers ? `${modifiers}+` : ''}${config.key}`;
  }

  /**
   * Handle keyboard event
   */
  handle(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Ctrl/Cmd+S in textareas/inputs
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === 's' &&
        target.tagName === 'TEXTAREA'
      ) {
        // Allow this shortcut
      } else {
        return;
      }
    }

    for (const config of this.shortcuts.values()) {
      if (this.matches(event, config)) {
        event.preventDefault();
        config.handler(event);
        break;
      }
    }
  }

  /**
   * Initialize event listener
   */
  init(): () => void {
    const handler = (event: KeyboardEvent) => this.handle(event);
    document.addEventListener('keydown', handler);

    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }
}

// Singleton instance
export const keyboardShortcuts = new KeyboardShortcutsManager();

// Initialize on module load
keyboardShortcuts.init();

