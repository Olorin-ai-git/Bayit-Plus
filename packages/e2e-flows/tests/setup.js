"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
// Load environment variables from .env file
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '../.env.test') });
// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.E2E_TIMEOUT = process.env.E2E_TIMEOUT || '300000';
process.env.E2E_MOCK_APIS = process.env.E2E_MOCK_APIS || 'true';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'cvplus-test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
// Global test timeout
jest.setTimeout(parseInt(process.env.E2E_TIMEOUT, 10));
global.testConfig = {
    timeout: parseInt(process.env.E2E_TIMEOUT, 10),
    mockApis: process.env.E2E_MOCK_APIS === 'true',
    baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
    apiUrl: process.env.E2E_API_URL || 'http://localhost:5001',
};
// Mock console methods in test environment to reduce noise
if (process.env.NODE_ENV === 'test') {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    // Keep console.error for debugging
}
// Global test cleanup
afterEach(() => {
    jest.clearAllMocks();
});
// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
//# sourceMappingURL=setup.js.map