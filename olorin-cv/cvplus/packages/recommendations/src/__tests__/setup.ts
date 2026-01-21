/**
 * Test Setup Configuration
 * Handles Firebase mocking and test environment initialization
  */

import { vi, beforeAll } from 'vitest';
import { logger } from '@cvplus/core';

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

// Set up test environment variables FIRST
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project-id';
process.env.PROJECT_ID = 'test-project-id';
process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket.appspot.com';
process.env.STORAGE_BUCKET = 'test-bucket.appspot.com';
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: 'test-project-id',
  storageBucket: 'test-bucket.appspot.com',
});

// ============================================================================
// GLOBAL MOCKS
// ============================================================================

// Mock Firebase Admin SDK completely
vi.mock('firebase-admin', () => {
  const mockApp = {
    name: '[DEFAULT]',
    options: {}
  };
  
  const mockFirestore = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: vi.fn().mockReturnValue({}),
        }),
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      })),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      }),
      add: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    })),
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: vi.fn().mockReturnValue({}),
      }),
      set: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })),
    batch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
  };

  return {
    initializeApp: vi.fn(() => mockApp),
    getApp: vi.fn(() => mockApp),
    getApps: vi.fn(() => [mockApp]),
    credential: {
      applicationDefault: vi.fn(),
      cert: vi.fn(),
    },
    firestore: vi.fn(() => mockFirestore),
    storage: vi.fn(() => ({
      bucket: vi.fn(() => ({
        file: vi.fn(() => ({
          save: vi.fn().mockResolvedValue(undefined),
          download: vi.fn().mockResolvedValue([Buffer.from('mock-content')]),
          delete: vi.fn().mockResolvedValue(undefined),
          exists: vi.fn().mockResolvedValue([true]),
        })),
      })),
    })),
  };
});

// Mock Firebase Client SDK
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(),
    doc: vi.fn(),
  })),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({}),
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
}));

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: {} })),
}));

vi.mock('firebase-functions', () => ({
  https: {
    onCall: vi.fn((handler) => handler),
    onRequest: vi.fn((handler) => handler),
  },
  firestore: {
    document: vi.fn(() => ({
      onCreate: vi.fn(),
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
    })),
  },
  config: vi.fn(() => ({
    anthropic: {
      api_key: 'test-api-key',
    },
    firebase: {
      project_id: 'test-project-id',
      storage_bucket: 'test-bucket.appspot.com',
    },
  })),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            recommendations: [
              {
                id: 'test-rec-1',
                type: 'skill_improvement',
                title: 'Enhance JavaScript Skills',
                description: 'Consider learning advanced JavaScript concepts',
                priority: 'high',
                impact: 8,
                effort: 6,
              }
            ],
            analysis: {
              strengths: ['Strong technical background'],
              improvements: ['Could benefit from more project examples'],
            }
          })
        }],
        usage: {
          input_tokens: 100,
          output_tokens: 200,
        }
      })
    }
  }))
}));

// Mock Core module functions
vi.mock('@cvplus/core', () => ({
  generateId: vi.fn(() => 'test-id-123'),
  validateUser: vi.fn(() => true),
  validateCVData: vi.fn(() => true),
  ApiResponse: {
    success: vi.fn((data) => ({ success: true, data })),
    error: vi.fn((message) => ({ success: false, error: { message } })),
  },
}));

// ============================================================================
// GLOBAL TEST CONFIGURATION
// ============================================================================

// Set up global test defaults
(globalThis as any).__FIREBASE_DEFAULTS__ = {
  projectId: 'test-project-id',
  storageBucket: 'test-bucket.appspot.com',
};

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
globalThis.console = {
  ...originalConsole,
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  // Keep error for test debugging
  error: originalConsole.error,
};

// ============================================================================
// SETUP HOOKS
// ============================================================================

beforeAll(() => {
  // Additional setup if needed
  logger.info('Test environment initialized');
});