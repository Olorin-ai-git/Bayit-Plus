/**
 * Service Tests Setup File
 * Feature: 001-extensive-investigation-report
 * Task: T078
 *
 * Setup for testing API services and data fetching logic
 */

import '@testing-library/jest-dom';

// Mock fetch globally for service tests
global.fetch = jest.fn();

// Reset fetch mock before each test
beforeEach(() => {
  (global.fetch as jest.Mock).mockClear();
});
