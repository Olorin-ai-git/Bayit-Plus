/**
 * Picovoice Porcupine Web Stub
 * Stubs out web-only wake word detection for React Native mobile
 * Mobile uses native wake word detection instead
 */

// PorcupineWorker stub
export const PorcupineWorker = {
  create: async () => ({
    start: async () => {},
    stop: async () => {},
    pause: async () => {},
    resume: async () => {},
    release: async () => {},
  }),
};

// BuiltInKeyword enum stub
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

// WebVoiceProcessor stub
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
