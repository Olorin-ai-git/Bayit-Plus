/**
 * Clipboard Web Shim
 *
 * Provides a navigator.clipboard-based implementation of the
 * @react-native-clipboard/clipboard API for web builds.
 * Webpack alias redirects native Clipboard imports here.
 */

const clipboardWeb = {
  getString: async (): Promise<string> => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  },

  setString: (content: string): void => {
    try {
      navigator.clipboard.writeText(content);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  },

  hasString: async (): Promise<boolean> => {
    try {
      const text = await navigator.clipboard.readText();
      return text.length > 0;
    } catch {
      return false;
    }
  },

  hasURL: async (): Promise<boolean> => {
    return false;
  },

  hasNumber: async (): Promise<boolean> => {
    return false;
  },

  hasWebURL: async (): Promise<boolean> => {
    try {
      const text = await navigator.clipboard.readText();
      return /^https?:\/\//.test(text.trim());
    } catch {
      return false;
    }
  },

  addListener: (): { remove: () => void } => {
    return { remove: () => {} };
  },

  removeAllListeners: (): void => {},
};

export default clipboardWeb;
