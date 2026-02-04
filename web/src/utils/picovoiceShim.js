/**
 * Shim for @picovoice/porcupine-web and @picovoice/web-voice-processor
 * These packages are optional - only used for wake word detection on supported platforms.
 * On web, wake word detection falls back to Vosk or is disabled.
 */

export class Porcupine {
  static _porcupineMutex = { tryAcquire: () => true, release: () => {} };

  static async create() {
    throw new Error('Porcupine wake word detection is not available on this platform');
  }

  async process() {
    return -1;
  }

  async delete() {}
  async release() {}
}

export class PorcupineWorker extends Porcupine {}

export const BuiltInKeywords = {};

export class WebVoiceProcessor {
  static async subscribe() {}
  static async unsubscribe() {}
  static async reset() {}
  static isRecording = false;
}

export default { Porcupine, PorcupineWorker, BuiltInKeywords, WebVoiceProcessor };
