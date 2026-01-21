/**
 * Integration Tests Setup File
 * Feature: 001-extensive-investigation-report
 * Task: T078
 *
 * Setup for integration tests that require additional configuration
 */

import '@testing-library/jest-dom';

// Mock environment variables for integration tests
process.env.REACT_APP_API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';
process.env.REACT_APP_WS_BASE_URL = process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:8090';

// Extended timeout for integration tests (already set in jest.config.js but good to have here too)
jest.setTimeout(15000);
