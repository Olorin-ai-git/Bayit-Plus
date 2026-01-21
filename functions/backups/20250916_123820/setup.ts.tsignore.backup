// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Test setup file for cv-processing package
 * 
 * This file configures the test environment for Vitest including:
 * - Global test utilities
 * - Mock configurations
 * - Test environment setup
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase modules
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  credential: {
    applicationDefault: vi.fn()
  },
  firestore: vi.fn(() => ({
    collection: vi.fn(),
    doc: vi.fn()
  })),
  storage: vi.fn(() => ({
    bucket: vi.fn()
  }))
}));

vi.mock('firebase-functions', () => ({
  config: vi.fn(() => ({})),
  https: {
    onCall: vi.fn(),
    onRequest: vi.fn()
  },
  firestore: {
    document: vi.fn()
  }
}));

// Mock Anthropic Claude SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: 'Mock AI response' }]
      })
    }
  }))
}));

// Mock CVPlus core packages
vi.mock('@cvplus/core', () => ({
  // Mock core types and utilities as needed
  validateInput: vi.fn(),
  formatError: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('@cvplus/auth', () => ({
  // Mock auth utilities as needed
  verifyToken: vi.fn(),
  getUserPermissions: vi.fn()
}));

// Global test setup
beforeAll(() => {
  // Setup global test environment
  console.log('Setting up cv-processing test environment');
});

afterAll(() => {
  // Cleanup global test environment
  console.log('Cleaning up cv-processing test environment');
});

beforeEach(() => {
  // Setup for each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// Global test utilities
export const createMockCVData = (overrides = {}) => ({
  id: 'test-cv-id',
  userId: 'test-user-id',
  content: 'Test CV content',
  metadata: {
    originalFileName: 'test-cv.pdf',
    fileSize: 1024,
    fileType: 'pdf'
  },
  status: 'completed',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockProcessingRequest = (overrides = {}) => ({
  type: 'analysis',
  data: {
    cvContent: 'Test CV content'
  },
  options: {
    aiModel: 'claude-3-sonnet-20240229',
    language: 'en'
  },
  ...overrides
});

export const createMockProcessingResponse = (overrides = {}) => ({
  success: true,
  data: {
    score: 85,
    suggestions: [],
    keywords: ['test', 'cv']
  },
  metadata: {
    processingTime: 1000,
    tokensUsed: 100,
    timestamp: new Date()
  },
  ...overrides
});

// Export test utilities for use in individual test files
export { vi, beforeAll, afterAll, beforeEach, afterEach };