/**
 * Validation Utilities
 * 
 * Validation functions for authentication data and user input.
 * Uses Core utilities where available to avoid duplication.
  */

import { VALIDATION_PATTERNS } from '../constants/auth.constants';
import type { AuthConfig } from '../types';

// Import Core utilities when available
let coreValidateEmail: ((email: string) => boolean) | null = null;
let coreValidatePhoneNumber: ((phone: string) => boolean) | null = null;

try {
  const coreUtils = require('@cvplus/core');
  coreValidateEmail = coreUtils.validateEmail;
  coreValidatePhoneNumber = coreUtils.validatePhoneNumber;
} catch (error) {
  // Core utilities not available, will use local implementations
}

/**
 * Validates an email address
 * Uses Core utility if available, otherwise falls back to local implementation
  */
export function validateEmail(email: string): boolean {
  if (coreValidateEmail) {
    return coreValidateEmail(email);
  }
  
  // Fallback implementation
  if (!email || typeof email !== 'string') {
    return false;
  }

  return VALIDATION_PATTERNS.EMAIL.test(email.trim());
}

/**
 * Validates a password based on the configuration
  */
export function validatePassword(password: string, config?: AuthConfig): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }

  // Use default password policy since it's not in the config
  const passwordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    forbidCommonPasswords: true
  };

  // Check minimum length
  if (password.length < passwordPolicy.minLength) {
    return false;
  }

  // Check for uppercase letters
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    return false;
  }

  // Check for lowercase letters
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    return false;
  }

  // Check for numbers
  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    return false;
  }

  // Check for special characters
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }

  // Check for common passwords
  if (passwordPolicy.forbidCommonPasswords && isCommonPassword(password)) {
    return false;
  }

  // No custom validation for now

  return true;
}

/**
 * Validates a phone number
 * Uses Core utility if available, otherwise falls back to local implementation
  */
export function validatePhoneNumber(phone: string): boolean {
  if (coreValidatePhoneNumber) {
    return coreValidatePhoneNumber(phone);
  }
  
  // Fallback implementation
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  return VALIDATION_PATTERNS.PHONE.test(phone.trim());
}

/**
 * Validates a UUID
  */
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }

  return VALIDATION_PATTERNS.UUID.test(uuid.trim());
}

/**
 * Validates a JWT token format
  */
export function validateJWT(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  return VALIDATION_PATTERNS.JWT.test(token.trim());
}

// Helper function for common passwords
function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  return commonPasswords.includes(password.toLowerCase());
}