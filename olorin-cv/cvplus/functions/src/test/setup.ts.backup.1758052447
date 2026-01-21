/**
 * Jest Test Setup for CVPlus Functions
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'cvplus-test';

// Increase timeout for all tests
jest.setTimeout(60000);

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up CVPlus test environment...');
  
  // Validate required environment variables
  const requiredEnvVars = ['ANTHROPIC_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Some tests may fail without proper API keys');
  } else {
    console.log('✅ All required environment variables are set');
  }
});

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  // Any global cleanup can go here
});

// Mock console.log in tests to reduce noise (optional)
global.console = {
  ...console,
  log: jest.fn(console.log),
  warn: jest.fn(console.warn),
  error: jest.fn(console.error),
};