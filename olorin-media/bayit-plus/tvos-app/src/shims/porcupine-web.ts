/**
 * Porcupine Wake Word shim for tvOS
 * The Picovoice Porcupine SDK is web-only, so we provide a no-op implementation for tvOS
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const PorcupineKeyword = {};
export const BuiltInKeyword = {};

export class PorcupineWorker {
  static create(): Promise<PorcupineWorker> {
    return Promise.resolve(new PorcupineWorker());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process(_frame: Int16Array): number {
    return -1;
  }

  release(): void {
    // No-op
  }
}

export default {
  PorcupineKeyword,
  BuiltInKeyword,
  PorcupineWorker,
};
