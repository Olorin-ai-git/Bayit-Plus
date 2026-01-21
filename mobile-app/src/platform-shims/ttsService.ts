/**
 * TTS Service Platform Shim for React Native
 *
 * Provides compatibility layer for web-specific TTS service imports.
 * Mobile platforms use react-native-tts or expo-speech for text-to-speech.
 * This shim provides API compatibility for shared code that imports the web TTS service.
 */

export const ttsService = {
  speak: async (_text: string) => {
    // Mobile uses react-native-tts - this shim provides API compatibility only
  },
  stop: () => {
    // No-op for API compatibility
  },
  pause: () => {
    // No-op for API compatibility
  },
  resume: () => {
    // No-op for API compatibility
  },
};

export default ttsService;
