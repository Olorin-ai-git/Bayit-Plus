/**
 * Picovoice Porcupine Platform Shim for React Native
 *
 * Provides compatibility layer for web-only @picovoice/porcupine-web imports.
 * Mobile platforms use @picovoice/porcupine-react-native for wake word detection.
 * This shim provides API type compatibility for shared code.
 */

export const PorcupineWorker = {
  create: async () => ({
    start: async () => {},
    stop: async () => {},
    pause: async () => {},
    resume: async () => {},
    release: async () => {},
  }),
};

export enum BuiltInKeyword {
  Alexa = 'Alexa',
  Americano = 'Americano',
  Blueberry = 'Blueberry',
  Bumblebee = 'Bumblebee',
  Computer = 'Computer',
  Grapefruit = 'Grapefruit',
  Grasshopper = 'Grasshopper',
  HeyGoogle = 'Hey Google',
  HeyBarista = 'Hey Barista',
  HeySiri = 'Hey Siri',
  Jarvis = 'Jarvis',
  OkGoogle = 'Ok Google',
  Picovoice = 'Picovoice',
  Porcupine = 'Porcupine',
  Terminator = 'Terminator',
}

export const WebVoiceProcessor = {
  init: async () => {},
  start: async () => {},
  stop: async () => {},
  subscribe: () => {},
  unsubscribe: () => {},
};

export default {
  PorcupineWorker,
  BuiltInKeyword,
  WebVoiceProcessor,
};
