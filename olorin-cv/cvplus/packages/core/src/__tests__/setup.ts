/**
 * Test setup for CVPlus Core package
 * Configure global test environment and utilities
  */

// Global test environment configuration

// Setup timezone for consistent date testing across environments
process.env.TZ = 'UTC';

// Test environment setup and cleanup
const originalDateNow = Date.now;

beforeEach(() => {
  // Reset Date.now to original implementation for each test
  Date.now = originalDateNow;
});

// No test framework specific patterns allowed in setup file