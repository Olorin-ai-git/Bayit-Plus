// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Test Data Utilities for Public Profiles Contract Tests
 *
 * Provides typed test data and utilities for contract testing
 * that leverage local constants and types from the public-profiles submodule.
 *
 * @fileoverview Test data utilities for public profiles tests
 */

import {
  PROFILE_CONSTANTS,
  API_CONSTANTS
} from '../../constants';
import type {
  PublicProfileData,
  ContactFormSettings,
  SocialLinks
} from '../../types';

// Mock Job IDs for testing
export const TEST_JOB_IDS = {
  VALID: '123e4567-e89b-12d3-a456-426614174000',
  INVALID_FORMAT: 'invalid-job-id',
  NON_EXISTENT: '000e0000-e00b-00d0-a000-000000000000',
  PROCESSING: '456e7890-e12b-34c5-d678-901234567890',
  FAILED: '789e0123-e45f-67g8-h901-234567890123'
} as const;

// Test Authentication Tokens
export const TEST_TOKENS = {
  VALID: 'mock-firebase-auth-token',
  INVALID: 'invalid-token',
  DIFFERENT_USER: 'different-user-token'
} as const;

// Test Profile Data Factory
export const createTestProfileData = (overrides: Partial<any> = {}): any => ({
  jobId: TEST_JOB_IDS.VALID,
  settings: {
    visibility: PROFILE_CONSTANTS.VISIBILITY_LEVELS.PUBLIC,
    customUrl: 'test-profile',
    theme: PROFILE_CONSTANTS.TEMPLATES.PROFESSIONAL,
    includeContact: true,
    includeDownloadLinks: true,
    includeSocialMedia: true,
    includeTestimonials: false,
    ...overrides.settings
  },
  personalInfo: {
    displayName: 'Test User',
    tagline: 'Software Developer',
    bio: 'Experienced software developer with expertise in web technologies.',
    location: 'San Francisco, CA',
    timezone: 'America/Los_Angeles',
    ...overrides.personalInfo
  },
  contactInfo: {
    email: 'test@example.com',
    phone: '+1 (555) 123-4567',
    website: 'https://testuser.dev',
    linkedin: 'https://linkedin.com/in/testuser',
    github: 'https://github.com/testuser',
    ...overrides.contactInfo
  },
  ...overrides
});

// Valid Social Media Links
export const createValidSocialLinks = (): SocialLinks => ({
  linkedin: 'https://linkedin.com/in/testuser',
  github: 'https://github.com/testuser',
  twitter: 'https://twitter.com/testuser',
  instagram: 'https://instagram.com/testuser',
  personalWebsite: 'https://testuser.dev'
});

// Invalid Test Data for Validation Tests
export const INVALID_TEST_DATA = {
  EMAIL: 'invalid-email-format',
  URL: 'not-a-valid-url',
  CUSTOM_URL: 'invalid url with spaces!',
  LONG_BIO: 'A'.repeat(PROFILE_CONSTANTS.MAX_SUMMARY_LENGTH + 1),
  LONG_TAGLINE: 'A'.repeat(PROFILE_CONSTANTS.MAX_HEADLINE_LENGTH + 1),
  INVALID_THEME: 'invalid_theme',
  INVALID_VISIBILITY: 'invalid_visibility'
} as const;

// Expected API Response Structure
export interface ExpectedProfileResponse {
  profileId: string;
  publicUrl: string;
  status: string;
  jobId: string;
  createdAt: string;
  settings: {
    visibility: string;
    theme: string;
    [key: string]: any;
  };
}

// Test Scenarios Configuration
export const TEST_SCENARIOS = {
  SUCCESS: {
    BASIC_PROFILE: 'Basic profile creation',
    WITH_SOCIAL_LINKS: 'Profile with social media links',
    MINIMAL_CONFIG: 'Profile with minimal configuration',
    CUSTOM_URL: 'Profile with custom URL'
  },
  VALIDATION_ERRORS: {
    MISSING_JOB_ID: 'Missing required jobId',
    MISSING_DISPLAY_NAME: 'Missing required displayName',
    INVALID_JOB_FORMAT: 'Invalid jobId format',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_URL: 'Invalid URL format',
    BIO_TOO_LONG: 'Bio exceeds maximum length',
    TAGLINE_TOO_LONG: 'Tagline exceeds maximum length',
    INVALID_CUSTOM_URL: 'Invalid custom URL format'
  },
  BUSINESS_LOGIC_ERRORS: {
    JOB_NOT_FOUND: 'Job not found',
    JOB_NOT_COMPLETED: 'Job not completed',
    JOB_FAILED: 'Job failed',
    PROFILE_EXISTS: 'Profile already exists',
    DUPLICATE_URL: 'Custom URL already taken'
  },
  AUTH_ERRORS: {
    MISSING_AUTH: 'Missing authentication',
    INVALID_TOKEN: 'Invalid authentication token',
    ACCESS_DENIED: 'Access denied to resource'
  }
} as const;

// Helper Functions for Test Assertions
export const expectValidProfileResponse = (response: any, expectedJobId: string = TEST_JOB_IDS.VALID) => {
  expect(response.status).toBe(API_CONSTANTS.RESPONSE_CODES.CREATED);
  expect(response.data).toHaveProperty('profileId');
  expect(response.data).toHaveProperty('publicUrl');
  expect(response.data).toHaveProperty('status');
  expect(response.data).toHaveProperty('jobId');
  expect(response.data).toHaveProperty('createdAt');
  expect(response.data).toHaveProperty('settings');

  // Validate data types and formats
  expect(typeof response.data.profileId).toBe('string');
  expect(response.data.profileId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
  expect(response.data.jobId).toBe(expectedJobId);
  expect(response.data.status).toBe(PROFILE_CONSTANTS.STATUS.ACTIVE);
  expect(typeof response.data.publicUrl).toBe('string');
};

export const expectValidationError = (error: any, errorCode: string, statusCode: number = API_CONSTANTS.RESPONSE_CODES.BAD_REQUEST) => {
  expect(error.response.status).toBe(statusCode);
  expect(error.response.data).toHaveProperty('error', errorCode);
  expect(error.response.data).toHaveProperty('message');
  expect(typeof error.response.data.message).toBe('string');
};

// Available options for parameterized tests
export const getAvailableThemes = () => Object.values(PROFILE_CONSTANTS.TEMPLATES);
export const getAvailableVisibility = () => Object.values(PROFILE_CONSTANTS.VISIBILITY_LEVELS);

// Configuration validation helpers
export const isValidTheme = (theme: string): boolean =>
  Object.values(PROFILE_CONSTANTS.TEMPLATES).includes(theme as any);

export const isValidVisibility = (visibility: string): boolean =>
  Object.values(PROFILE_CONSTANTS.VISIBILITY_LEVELS).includes(visibility as any);

// URL validation helpers
export const isValidCustomUrl = (url: string): boolean => {
  return url.length >= PROFILE_CONSTANTS.MIN_SLUG_LENGTH &&
         url.length <= PROFILE_CONSTANTS.MAX_SLUG_LENGTH &&
         PROFILE_CONSTANTS.SLUG_PATTERN.test(url) &&
         !PROFILE_CONSTANTS.RESERVED_SLUGS.includes(url as any);
};

// Length validation helpers
export const createValidBio = (length: number = PROFILE_CONSTANTS.MAX_SUMMARY_LENGTH - 10): string =>
  'A'.repeat(Math.min(length, PROFILE_CONSTANTS.MAX_SUMMARY_LENGTH));

export const createValidTagline = (length: number = PROFILE_CONSTANTS.MAX_HEADLINE_LENGTH - 10): string =>
  'A'.repeat(Math.min(length, PROFILE_CONSTANTS.MAX_HEADLINE_LENGTH));

// Error code constants for easy reference
export const ERROR_CODES = {
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_JOB_ID_FORMAT: 'INVALID_JOB_ID_FORMAT',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  INVALID_THEME: 'INVALID_THEME',
  INVALID_VISIBILITY_OPTION: 'INVALID_VISIBILITY_OPTION',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  INVALID_URL_FORMAT: 'INVALID_URL_FORMAT',
  CUSTOM_URL_ALREADY_EXISTS: 'CUSTOM_URL_ALREADY_EXISTS',
  JOB_NOT_COMPLETED: 'JOB_NOT_COMPLETED',
  JOB_FAILED: 'JOB_FAILED',
  PROFILE_ALREADY_EXISTS: 'PROFILE_ALREADY_EXISTS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  BIO_TOO_LONG: 'BIO_TOO_LONG',
  TAGLINE_TOO_LONG: 'TAGLINE_TOO_LONG',
  INVALID_CUSTOM_URL_FORMAT: 'INVALID_CUSTOM_URL_FORMAT'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];