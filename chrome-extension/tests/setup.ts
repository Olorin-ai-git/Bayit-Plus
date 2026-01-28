/**
 * Vitest Setup File
 *
 * Mocks Chrome Extension APIs for testing environment
 */

import { vi } from 'vitest';

// Mock chrome.storage API
const mockStorage = {
  local: {
    get: vi.fn((keys: string | string[] | { [key: string]: any } | null) => {
      return Promise.resolve({});
    }),
    set: vi.fn((items: { [key: string]: any }) => {
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      return Promise.resolve();
    }),
  },
  sync: {
    get: vi.fn((keys: string | string[] | { [key: string]: any } | null) => {
      return Promise.resolve({});
    }),
    set: vi.fn((items: { [key: string]: any }) => {
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      return Promise.resolve();
    }),
  },
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
  },
};

// Mock chrome.runtime API
const mockRuntime = {
  getManifest: vi.fn(() => ({
    version: '1.0.0',
    name: 'Bayit+ Translator',
  })),
  sendMessage: vi.fn((message: any) => Promise.resolve({})),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  id: 'mock-extension-id',
};

// Mock chrome.identity API
const mockIdentity = {
  getProfileUserInfo: vi.fn(() => Promise.resolve({ id: 'mock-user-id', email: '' })),
};

// Mock chrome.tabCapture API
const mockTabCapture = {
  capture: vi.fn((options: any) => {
    return Promise.resolve(new MediaStream());
  }),
};

// Mock chrome.offscreen API
const mockOffscreen = {
  createDocument: vi.fn((params: any) => Promise.resolve()),
  closeDocument: vi.fn(() => Promise.resolve()),
  hasDocument: vi.fn(() => Promise.resolve(false)),
};

// Mock global chrome object
(global as any).chrome = {
  storage: mockStorage,
  runtime: mockRuntime,
  identity: mockIdentity,
  tabCapture: mockTabCapture,
  offscreen: mockOffscreen,
};

// Mock WebSocket for testing
class MockWebSocket {
  public readyState = 0; // CONNECTING
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: any): void {
    // Mock send
  }

  close(code?: number, reason?: string): void {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

(global as any).WebSocket = MockWebSocket;

// Mock AudioContext
class MockAudioContext {
  public sampleRate = 16000;
  public state = 'running';

  createMediaStreamSource(): any {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createGain(): any {
    return {
      gain: { value: 1.0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createBufferSource(): any {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  decodeAudioData(arrayBuffer: ArrayBuffer): Promise<any> {
    return Promise.resolve({
      duration: 1.0,
      length: 16000,
      sampleRate: 16000,
    });
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }
}

(global as any).AudioContext = MockAudioContext;

// Mock crypto for encryption tests
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {};
}

// Ensure getRandomValues exists
if (!global.crypto.getRandomValues) {
  (global.crypto as any).getRandomValues = (array: any) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

// Mock crypto.subtle methods (will be set up per-test as needed with vi.spyOn)
if (!global.crypto.subtle) {
  (global.crypto as any).subtle = {
    encrypt: async () => new ArrayBuffer(40),
    decrypt: async () => new ArrayBuffer(20),
    importKey: async () => ({} as CryptoKey),
    deriveKey: async () => ({} as CryptoKey),
    deriveBits: async () => new ArrayBuffer(32),
  };
}

// Mock fetch for API tests
global.fetch = vi.fn((url: string, options?: any) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  } as Response);
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => null),
  setItem: vi.fn((key: string, value: string) => {}),
  removeItem: vi.fn((key: string) => {}),
  clear: vi.fn(() => {}),
  length: 0,
  key: vi.fn((index: number) => null),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
