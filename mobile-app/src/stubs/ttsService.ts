/**
 * TTS Service Stub for Mobile
 * Stubs out web-specific TTS service
 */

export const ttsService = {
  speak: async (text: string) => {
    console.log('[TTS Stub] speak:', text);
  },
  stop: () => {
    console.log('[TTS Stub] stop');
  },
  pause: () => {
    console.log('[TTS Stub] pause');
  },
  resume: () => {
    console.log('[TTS Stub] resume');
  },
};

export default ttsService;
