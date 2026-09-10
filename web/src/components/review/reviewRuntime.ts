import logger from '../../utils/logger';
import { copy, reviewConfig } from './reviewConfig';
import { evidenceSchema, privateRoute, type Pin, type ReviewContext } from './reviewModel';

export interface ReviewRuntime {
  now: () => string;
  uuid: () => string;
  digest: (value: string) => Promise<string>;
  read: () => string | null;
  write: (value: string) => void;
  download: (value: string, filename: string) => void;
  log: (event: string) => void;
}

export function createReviewRuntime(browser: Window): ReviewRuntime {
  const log = logger.scope('LocalReview');
  return {
    now: () => new Date().toISOString(),
    uuid: () => browser.crypto.randomUUID(),
    digest: async value => {
      const bytes = new TextEncoder().encode(value);
      const digest = await browser.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    },
    read: () => browser.localStorage.getItem(reviewConfig.storageKey),
    write: value => browser.localStorage.setItem(reviewConfig.storageKey, value),
    download: (value, filename) => {
      const url = URL.createObjectURL(new Blob([value], { type: 'application/json' }));
      const link = browser.document.createElement('a');
      link.href = url;
      link.download = filename;
      browser.document.body.append(link);
      try { link.click(); } finally { link.remove(); URL.revokeObjectURL(url); }
    },
    // Debug is the existing logger's local-only path. Never pass findings or DOM data.
    log: event => log.debug(event),
  };
}

export function readEvidence(runtime: ReviewRuntime): { pins: Pin[]; error: string; writable: boolean } {
  try {
    const raw = runtime.read();
    if (!raw) return { pins: [], error: '', writable: true };
    if (raw.length > reviewConfig.maxStoredBytes) throw new Error();
    return { pins: evidenceSchema.parse(JSON.parse(raw)).pins, error: '', writable: true };
  } catch {
    runtime.log('review_storage_read_failed');
    return { pins: [], error: copy.invalidStorage, writable: false };
  }
}

export async function captureContext(runtime: ReviewRuntime, browser: Window, buildSha: string, pathname: string): Promise<ReviewContext> {
  return {
    buildSha, route: privateRoute(pathname), routeKey: await runtime.digest(pathname),
    viewport: { width: browser.innerWidth, height: browser.innerHeight, pixelRatio: browser.devicePixelRatio },
    timestamp: runtime.now(),
  };
}

export function serializeEvidence(pins: Pin[]): string {
  return JSON.stringify(evidenceSchema.parse({ schemaVersion: reviewConfig.schemaVersion, pins }), null, 2);
}
