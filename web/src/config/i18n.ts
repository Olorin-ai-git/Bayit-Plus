/**
 * Web-specific i18n configuration
 *
 * Initializes @bayit/i18n which merges:
 * - 74 core keys from @olorin/shared-i18n
 * - 8 platform keys from @bayit/i18n
 */

import { initBayitI18nWeb } from '@bayit/i18n/web';

// Initialize i18n with merged resources
let i18nInstance: Awaited<ReturnType<typeof initBayitI18nWeb>> | null = null;

export async function initI18n() {
  if (!i18nInstance) {
    i18nInstance = await initBayitI18nWeb();
  }
  return i18nInstance;
}

// For synchronous access after initialization
export function getI18n() {
  if (!i18nInstance) {
    throw new Error('i18n not initialized. Call initI18n() first.');
  }
  return i18nInstance;
}

// Default export for backward compatibility (will be initialized by App.tsx)
export default {
  init: initI18n,
  get: getI18n,
};
